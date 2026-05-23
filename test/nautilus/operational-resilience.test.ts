// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeEach } from 'vitest';
import { ExecutionQueue, QueueStatus, QueueReasonCode, type ExecutionQueueItem, type QueueStore } from '../../src/lib/execution';
import { RuntimeExecutionEngine, ExecutionQueueOverflowError } from '../../core/runtime/execution-engine';
import { createDeviceRegistry } from '../../src/lib/control-plane/device-registry';
import { scheduleDeterministically } from '../../src/lib/control-plane/scheduler';
import { OperationalMemoryLog } from '../../src/lib/control-plane/operational-memory';
import { summarizeQueuePressure, summarizeExecutionTiming, summarizeSchedulerDecisions, summarizeDegradedStateAggregation } from '../../src/lib/control-plane/observability';
import { reconcileStartupState, type ExecutionSnapshot } from '../../core/runtime/survivability';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createInMemoryStore(): QueueStore {
  const items = new Map<string, ExecutionQueueItem>();
  return {
    get: (id: string) => items.get(id),
    set: (item: ExecutionQueueItem) => items.set(item.id, item),
    delete: (id: string) => items.delete(id),
    getAll: () => Array.from(items.values()),
  };
}

function makeItem(id: string, overrides?: Partial<ExecutionQueueItem>): ExecutionQueueItem {
  return {
    id,
    executionId: `exec-${id}`,
    status: QueueStatus.PENDING,
    executionState: 'initialized' as any,
    priority: 1,
    payload: { test: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 0,
    approvalRequired: false,
    ...overrides,
  };
}

const baseRequest = {
  version: '1', requestId: 'r', receivedAt: '2026-01-01T00:00:00.000Z',
  source: 't', actor: 'a', action: 'provider:select', requestedModel: 'm',
  constraints: [],
  metadata: { estimatedInputTokens: '1024', estimatedOutputTokens: '1024', vramRequiredMb: '8192' },
};

function node(nodeId: string, vram: number, context: number, meta: Record<string, string | number | boolean> = {}) {
  return {
    version: '1', nodeId, role: 'local' as const, transport: 'unix' as const, endpoint: 'x',
    trustClass: 'trusted' as const,
    registeredAt: '2026-01-01T00:00:00.000Z', lastHeartbeatAt: '2026-01-01T00:00:00.000Z',
    health: 'healthy' as const,
    metadata: { recentLatencyMs: 50, queuePressure: 0, estimatedCost: 0, queueDepth: 0, ...meta },
    capabilities: {
      version: '1', capturedAt: '2026-01-01T00:00:00.000Z', source: 't', runtimeBackend: 'x',
      executionMode: 'local' as const,
      gpus: [{ vendor: 'n', model: 'g', vramMb: vram, count: 1 }],
      models: [{
        modelId: 'm', maxContextTokens: context,
        flags: { streaming: false, tools: false, batch: false, multimodal: false, quantization: false },
        inferenceConstraints: [], executionRestrictions: [],
      }],
      policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [],
    },
  };
}

const allowPolicy = { decision: 'allow' as any, allowed: true, requiredApproval: false, reasonCode: 'policy_default_allow' as const, sourceRuleId: 'r', matchedRuleIds: ['r'] };
const defaultClassification = { taskKind: 'chat' as const, riskLevel: 'low' as const, latencySensitivity: 'standard' as const, contextRequirement: 'small' as const, requiresTools: false, requiresStreaming: false, batchSuitable: false, remoteExecutionEligible: true, approvalRequirementHint: 'none' as const, providerConstraints: [] };

// ===========================================================================
// Queue saturation & starvation
// ===========================================================================

describe('Queue saturation handling', () => {
  it('rejects enqueue when at capacity', () => {
    const store = createInMemoryStore();
    const queue = new ExecutionQueue(store, { maxCapacity: 2 });

    expect(queue.enqueue(makeItem('a')).allowed).toBe(true);
    expect(queue.enqueue(makeItem('b')).allowed).toBe(true);

    const decision = queue.enqueue(makeItem('c'));
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe(QueueReasonCode.QUEUE_FULL);
  });

  it('allows enqueue after dequeue frees capacity', () => {
    const store = createInMemoryStore();
    const queue = new ExecutionQueue(store, { maxCapacity: 1 });

    expect(queue.enqueue(makeItem('a')).allowed).toBe(true);
    queue.dequeue();

    expect(queue.enqueue(makeItem('b')).allowed).toBe(true);
  });

  it('dequeues starved items before newer items', () => {
    const store = createInMemoryStore();
    const queue = new ExecutionQueue(store, { starvationThresholdMs: 100 });

    // Enqueue first item with an old timestamp
    const oldItem = makeItem('old');
    oldItem.enqueuedAt = new Date(Date.now() - 200).toISOString();
    oldItem.queuePosition = 99;
    store.set(oldItem);

    // Enqueue second item fresh
    const newItem = makeItem('new');
    queue.enqueue(newItem);

    // The old starved item should come first despite higher position number
    const dequeued = queue.dequeue();
    expect(dequeued?.id).toBe('old');
  });
});

// ===========================================================================
// Dead-letter handling
// ===========================================================================

describe('Dead-letter routing', () => {
  it('transitions failed items to dead-letter', () => {
    const store = createInMemoryStore();
    const queue = new ExecutionQueue(store);

    const item = makeItem('dl');
    queue.enqueue(item);
    queue.updateStatus('dl', QueueStatus.RUNNING);
    queue.updateStatus('dl', QueueStatus.FAILED);

    const result = queue.moveToDeadLetter('dl');
    expect(result.allowed).toBe(true);
    expect(store.get('dl')?.status).toBe(QueueStatus.DEAD_LETTER);
    expect(store.get('dl')?.lastReason).toBe(QueueReasonCode.DEAD_LETTER_RETRY_EXHAUSTED);
  });

  it('rejects dead-letter transition from non-failed status', () => {
    const store = createInMemoryStore();
    const queue = new ExecutionQueue(store);

    const item = makeItem('pending-dl');
    queue.enqueue(item);

    const result = queue.moveToDeadLetter('pending-dl');
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe(QueueReasonCode.VALIDATION_FAILED);
  });

  it('dead-letter is a terminal state', () => {
    const store = createInMemoryStore();
    const queue = new ExecutionQueue(store);

    const item = makeItem('terminal');
    queue.enqueue(item);
    queue.updateStatus('terminal', QueueStatus.RUNNING);
    queue.updateStatus('terminal', QueueStatus.FAILED);
    queue.moveToDeadLetter('terminal');

    // Cannot transition out of dead-letter
    const result = queue.updateStatus('terminal', QueueStatus.PENDING);
    expect(result.allowed).toBe(false);
  });
});

// ===========================================================================
// Queue pressure snapshot
// ===========================================================================

describe('Queue pressure metrics', () => {
  it('captures accurate pressure from runtime state', () => {
    const store = createInMemoryStore();
    const queue = new ExecutionQueue(store, { maxCapacity: 10 });

    queue.enqueue(makeItem('p1'));
    queue.enqueue(makeItem('p2'));
    queue.enqueue(makeItem('p3'));
    queue.updateStatus('p1', QueueStatus.RUNNING);

    const snapshot = queue.captureQueuePressure();
    expect(snapshot.pendingCount).toBe(2);
    expect(snapshot.runningCount).toBe(1);
    expect(snapshot.deadLetterCount).toBe(0);
    expect(snapshot.capacityUtilization).toBe(0.3);
    expect(snapshot.starvationDetected).toBe(false);
  });

  it('detects starvation when oldest item exceeds threshold', () => {
    const store = createInMemoryStore();
    const queue = new ExecutionQueue(store, { starvationThresholdMs: 50 });

    const item = makeItem('starved');
    item.enqueuedAt = new Date(Date.now() - 100).toISOString();
    store.set(item);

    const snapshot = queue.captureQueuePressure();
    expect(snapshot.starvationDetected).toBe(true);
    expect(snapshot.oldestPendingAgeMs).toBeGreaterThan(50);
  });
});

// ===========================================================================
// Context overflow routing
// ===========================================================================

describe('Context overflow routing', () => {
  it('rejects candidates whose context window is insufficient', () => {
    const registry = createDeviceRegistry();
    registry.register(node('small-ctx', 16384, 1000));

    const result = scheduleDeterministically({
      request: baseRequest,
      classification: defaultClassification,
      registry,
      policy: allowPolicy,
      degradedStates: [],
    });

    expect(result.decision.selected).toBeUndefined();
    expect(result.decision.rejected.some((r) => r.rejectionReasons.some((rr) => rr.startsWith('context_overflow')))).toBe(true);
  });

  it('penalizes nodes near context window saturation', () => {
    const registry = createDeviceRegistry();
    // Node with tight context (90% utilization)
    registry.register(node('tight', 16384, 2300));
    // Node with plenty of context
    registry.register(node('roomy', 16384, 100000));

    const result = scheduleDeterministically({
      request: baseRequest,
      classification: defaultClassification,
      registry,
      policy: allowPolicy,
      degradedStates: [],
    });

    expect(result.decision.selected?.nodeId).toBe('roomy');
    // Routing receipt should show context utilization data
    expect(result.routingReceipt.scoringInputs.length).toBe(2);
  });
});

// ===========================================================================
// Routing stability under pressure
// ===========================================================================

describe('Routing stability under queue pressure', () => {
  it('deterministically selects lower-pressure node', () => {
    const registry = createDeviceRegistry();
    registry.register(node('low-pressure', 16384, 100000, { queuePressure: 0.1, queueDepth: 1 }));
    registry.register(node('high-pressure', 16384, 100000, { queuePressure: 0.9, queueDepth: 20 }));

    const result = scheduleDeterministically({
      request: baseRequest,
      classification: defaultClassification,
      registry,
      policy: allowPolicy,
      degradedStates: [],
    });

    expect(result.decision.selected?.nodeId).toBe('low-pressure');
  });

  it('produces consistent routing receipt', () => {
    const registry = createDeviceRegistry();
    registry.register(node('n1', 16384, 100000));

    const result = scheduleDeterministically({
      request: baseRequest,
      classification: defaultClassification,
      registry,
      policy: allowPolicy,
      degradedStates: [],
    });

    expect(result.routingReceipt.candidateCount).toBe(1);
    expect(result.routingReceipt.selectedNodeId).toBe('n1');
    expect(result.routingReceipt.decidedAt).toBeTruthy();
  });

  it('deterministic tie-break by nodeId on equal scores', () => {
    const registry = createDeviceRegistry();
    registry.register(node('b-node', 16384, 100000, { recentLatencyMs: 50 }));
    registry.register(node('a-node', 16384, 100000, { recentLatencyMs: 50 }));

    const result = scheduleDeterministically({
      request: baseRequest,
      classification: defaultClassification,
      registry,
      policy: allowPolicy,
      degradedStates: [],
    });

    // Equal scores, 'a-node' should win by lexicographic tie-break
    expect(result.decision.selected?.nodeId).toBe('a-node');
  });
});

// ===========================================================================
// Execution engine: dead-letter and timing
// ===========================================================================

describe('Execution engine dead-letter and timing', () => {
  it('emits dead-letter event on retry exhaustion', async () => {
    const engine = new RuntimeExecutionEngine(5);
    try {
      await engine.execute({
        runId: 'dl-run', timeoutMs: 100, retries: 1, backoffMs: 1,
        async handler() { throw new Error('boom'); },
      });
    } catch {
      // Expected failure
    }

    const events = engine.getEvents();
    expect(events.some((e) => e.kind === 'execution.dead_letter')).toBe(true);
    expect(events.some((e) => e.kind === 'execution.timing')).toBe(true);
  });

  it('emits timing evidence on successful execution', async () => {
    const engine = new RuntimeExecutionEngine(5);
    await engine.execute({
      runId: 'timed-run', timeoutMs: 1000, retries: 0, backoffMs: 1,
      async handler() { return 'ok'; },
    });

    const timingEvent = engine.getEvents().find((e) => e.kind === 'execution.timing');
    expect(timingEvent).toBeDefined();
    expect(timingEvent!.detail).toContain('totalMs=');
    expect(timingEvent!.detail).toContain('state=completed');
  });

  it('tracks peak pending tasks', async () => {
    const engine = new RuntimeExecutionEngine(10);
    const tasks = Array.from({ length: 5 }, (_, i) =>
      engine.execute({
        runId: `peak-${i}`, timeoutMs: 100, retries: 0, backoffMs: 1,
        async handler() { await new Promise((r) => setTimeout(r, 10)); return 'ok'; },
      }),
    );
    await Promise.all(tasks);
    expect(engine.getPeakPending()).toBeGreaterThanOrEqual(1);
  });

  it('queue pressure reflects runtime state', () => {
    const engine = new RuntimeExecutionEngine(10);
    expect(engine.getQueuePressure()).toBe(0);
  });
});

// ===========================================================================
// Token overflow degradation
// ===========================================================================

describe('Token overflow degradation', () => {
  it('rejection detail includes requested vs available context', () => {
    const registry = createDeviceRegistry();
    registry.register(node('small', 16384, 500));

    const result = scheduleDeterministically({
      request: { ...baseRequest, metadata: { ...baseRequest.metadata, estimatedInputTokens: '2000', estimatedOutputTokens: '2000' } },
      classification: defaultClassification,
      registry,
      policy: allowPolicy,
      degradedStates: [],
    });

    const rejection = result.decision.rejected.find((r) => r.rejectionReasons.some((rr) => rr.startsWith('context_overflow')));
    expect(rejection).toBeDefined();
    const overflowReason = rejection!.rejectionReasons.find((rr) => rr.startsWith('context_overflow'));
    expect(overflowReason).toContain('requested=4000');
    expect(overflowReason).toContain('window=500');
  });
});

// ===========================================================================
// Replay continuity
// ===========================================================================

describe('Replay continuity under failure', () => {
  it('reconciles orphaned executions deterministically', () => {
    const now = '2026-05-09T01:00:00.000Z';
    const snapshots: ExecutionSnapshot[] = [
      { runId: 'run-ok', state: 'completed', updatedAt: '2026-05-09T00:00:00.000Z', hasTerminalEvent: true },
      { runId: 'run-orphan', state: 'running', updatedAt: '2026-05-09T00:00:00.000Z', hasTerminalEvent: false },
      { runId: 'run-interrupted', state: 'running', updatedAt: '2026-05-09T00:59:30.000Z', hasTerminalEvent: false },
    ];

    const results = reconcileStartupState(snapshots, now, 60_000);

    expect(results.find((r) => r.runId === 'run-ok')?.action).toBe('keep_terminal');
    expect(results.find((r) => r.runId === 'run-orphan')?.action).toBe('mark_orphaned');
    expect(results.find((r) => r.runId === 'run-interrupted')?.action).toBe('mark_partial');
  });
});

// ===========================================================================
// Operational intelligence aggregation
// ===========================================================================

describe('Operational intelligence aggregation', () => {
  it('summarizes queue pressure from scheduler outcomes', () => {
    const log = new OperationalMemoryLog();
    log.append({
      occurredAt: '2026-05-09T00:00:00.000Z',
      category: 'scheduler_outcome',
      source: 'test',
      provenance: {},
      payload: {
        schedulingDecision: {
          selected: { nodeId: 'n1' },
          rejected: [
            { capabilityInputs: { queueDepth: 5, queuePressure: 0.3 }, rejectionReasons: ['not_selected'] },
            { capabilityInputs: { queueDepth: 15, queuePressure: 0.95 }, rejectionReasons: ['not_selected'] },
          ],
        },
      },
    });

    const metrics = summarizeQueuePressure(log.list());
    expect(metrics.sampleCount).toBe(2);
    expect(metrics.saturationCount).toBe(1);
    expect(metrics.maxDepth).toBe(15);
  });

  it('summarizes execution timing from receipts', () => {
    const log = new OperationalMemoryLog();
    log.append({
      occurredAt: '2026-05-09T00:00:00.000Z',
      category: 'receipt',
      source: 'test',
      provenance: {},
      payload: { receipt: { timing: { totalMs: 100, queueMs: 20, executionMs: 80 } } },
    });
    log.append({
      occurredAt: '2026-05-09T00:00:01.000Z',
      category: 'receipt',
      source: 'test',
      provenance: {},
      payload: { receipt: { timing: { totalMs: 300, queueMs: 50, executionMs: 250 } } },
    });

    const metrics = summarizeExecutionTiming(log.list());
    expect(metrics.sampleCount).toBe(2);
    expect(metrics.meanTotalMs).toBe(200);
    expect(metrics.minTotalMs).toBe(100);
    expect(metrics.maxTotalMs).toBe(300);
  });

  it('summarizes scheduler decisions', () => {
    const log = new OperationalMemoryLog();
    log.append({
      occurredAt: '2026-05-09T00:00:00.000Z',
      category: 'scheduler_outcome',
      source: 'test',
      provenance: {},
      payload: { schedulingDecision: { selected: { nodeId: 'n1' }, rejected: [{ rejectionReasons: ['insufficient_vram:available=1024,required=8192'] }] } },
    });
    log.append({
      occurredAt: '2026-05-09T00:00:01.000Z',
      category: 'scheduler_outcome',
      source: 'test',
      provenance: {},
      payload: { schedulingDecision: { rejected: [{ rejectionReasons: ['context_overflow:requested=4000,window=2000'] }] } },
    });

    const summary = summarizeSchedulerDecisions(log.list());
    expect(summary.totalDecisions).toBe(2);
    expect(summary.selectedCount).toBe(1);
    expect(summary.rejectedAllCount).toBe(1);
    expect(summary.topRejectionReasons['insufficient_vram']).toBe(1);
    expect(summary.topRejectionReasons['context_overflow']).toBe(1);
  });

  it('aggregates degraded states across runs', () => {
    const log = new OperationalMemoryLog();
    log.append({
      occurredAt: '2026-05-09T00:00:00.000Z',
      category: 'degraded_state',
      source: 'test',
      provenance: {},
      payload: { degraded: { reasonCode: 'heartbeat_stale', severity: 'warning', affectedSubsystem: 'inference' } },
    });
    log.append({
      occurredAt: '2026-05-09T00:00:01.000Z',
      category: 'degraded_state',
      source: 'test',
      provenance: {},
      payload: { degraded: { reasonCode: 'heartbeat_stale', severity: 'error', affectedSubsystem: 'inference' } },
    });
    log.append({
      occurredAt: '2026-05-09T00:00:02.000Z',
      category: 'degraded_state',
      source: 'test',
      provenance: {},
      payload: { degraded: { reasonCode: 'transport_unreachable', severity: 'critical', affectedSubsystem: 'transport' } },
    });

    const agg = summarizeDegradedStateAggregation(log.list());
    expect(agg.totalEvents).toBe(3);
    expect(agg.byReasonCode['heartbeat_stale']).toBe(2);
    expect(agg.byReasonCode['transport_unreachable']).toBe(1);
    expect(agg.affectedSubsystems).toEqual(['inference', 'transport']);
  });

  it('returns empty metrics when no events exist', () => {
    const metrics = summarizeQueuePressure([]);
    expect(metrics.sampleCount).toBe(0);
    expect(metrics.maxDepth).toBe(0);

    const timing = summarizeExecutionTiming([]);
    expect(timing.sampleCount).toBe(0);
    expect(timing.meanTotalMs).toBe(0);

    const decisions = summarizeSchedulerDecisions([]);
    expect(decisions.totalDecisions).toBe(0);
  });
});

// ===========================================================================
// Deterministic routing invariants
// ===========================================================================

describe('Deterministic routing invariants', () => {
  it('no_candidate result always returns empty routing receipt', () => {
    const registry = createDeviceRegistry();
    // No nodes registered — no candidates possible

    const result = scheduleDeterministically({
      request: baseRequest,
      classification: defaultClassification,
      registry,
      policy: allowPolicy,
      degradedStates: [],
    });

    expect(result.decision.selected).toBeUndefined();
    expect(result.routingReceipt.candidateCount).toBe(0);
    expect(result.routingReceipt.selectedNodeId).toBeNull();
  });

  it('policy-denied result returns complete exclusion data', () => {
    const registry = createDeviceRegistry();
    registry.register(node('n1', 16384, 100000));

    const result = scheduleDeterministically({
      request: baseRequest,
      classification: defaultClassification,
      registry,
      policy: { decision: 'deny' as any, allowed: false, requiredApproval: true, reasonCode: 'policy_rule_deny' as const, sourceRuleId: 'r', matchedRuleIds: ['r'] },
      degradedStates: [],
    });

    expect(result.decision.selected).toBeUndefined();
    expect(result.excludedByPolicy).toContain('*');
  });

  it('fallback plan is bounded to 2 candidates', () => {
    const registry = createDeviceRegistry();
    for (let i = 0; i < 5; i++) {
      registry.register(node(`n${i}`, 16384, 100000, { recentLatencyMs: 50 + i * 10 }));
    }

    const result = scheduleDeterministically({
      request: baseRequest,
      classification: defaultClassification,
      registry,
      policy: allowPolicy,
      degradedStates: [],
    });

    expect(result.decision.selected).toBeDefined();
    expect(result.fallbackPlan.length).toBeLessThanOrEqual(2);
  });
});
