// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildNautilusEvent, type NautilusEventEmitter, type NautilusEventEnvelope } from "./nautilus-event-fabric";
import type { OperatorGraphTraceWriter } from "./operatorgraph";
import type { RecallForgeRecord, RecallForgeWriter } from "./recallforge";
import type { ApprovalGate, RiskSignal } from "./threatmesh";
import type { GraphAwareRetriever, RetrievalResult } from "./meshrag";
import { buildProofpack, type Proofpack } from "./proofpacks";
import type { QueueGovernance } from "../control-plane/r5-queue-governance";
import { taskFingerprint, reuseGuard, estimateTokenBudget, saveCheckpoint, loadCheckpoint, replayCheckpoint, validateHandoffPacket, compactContextPreservingEvidence, type CheckpointState, type HandoffPacket } from "../control-plane/r4-handoff-primitives";
import { unavailableDegraded, type DegradedUnavailableState } from "../control-plane/r1-hardening";
import { buildOperatorConsoleSurface, type OperatorConsoleInput } from "./operator-console";

export type ExecutionId = string & { readonly __type: "execution_id" };

export interface RuntimeExecutor {
  run(input: { executionId: ExecutionId; correlationId: string }): Promise<Record<string, unknown>>;
}

export interface TruthLoopDependencies {
  eventBus: NautilusEventEmitter;
  traceWriter?: OperatorGraphTraceWriter;
  memoryStore?: RecallForgeWriter;
  policyGate?: ApprovalGate;
  retriever?: GraphAwareRetriever;
  runtime: RuntimeExecutor;
  proofpackSink?: (proofpack: Proofpack) => void;
  queueGovernance?: QueueGovernance;
  checkpointStore?: Map<string, string>;
  reuseCache?: Map<string, { safeToReuse: boolean; result: Record<string, unknown> }>;
}

export interface TruthLoopReport {
  executionId: ExecutionId;
  correlationId: string;
  traceId?: string;
  startedEvent: NautilusEventEnvelope;
  completedEvent?: NautilusEventEnvelope;
  failedEvent?: NautilusEventEnvelope;
  policyDecisionRef?: string;
  retrievalRef?: string;
  retrievalState: "completed" | "unavailable";
  memoryRecorded: boolean;
  degraded: string[];
  status: "completed" | "failed" | "denied" | "queue_saturated";
  proofpackId?: string;
}

export function asExecutionId(value: string): ExecutionId {
  if (!value) throw new Error("executionId is required");
  return value as ExecutionId;
}

export async function runTruthLoop(
  deps: TruthLoopDependencies,
  input: { executionId: string; correlationId: string; action: string; riskSignals?: RiskSignal[]; query?: string },
): Promise<TruthLoopReport> {
  const executionId = asExecutionId(input.executionId);
  const degraded: string[] = [];
  const memoryRecords: RecallForgeRecord[] = [];

  const startedEvent = buildNautilusEvent({
    type: "execution.started",
    source: "runtime",
    executionId,
    correlationId: input.correlationId,
    status: "started",
    payload: { action: input.action },
  });
  deps.eventBus.emit(startedEvent);

  let queueTimeline: Record<string, unknown>[] | undefined = undefined;

  if (deps.queueGovernance) {
    const enqueueResult = deps.queueGovernance.enqueue({
      queueId: `queue:${executionId}`,
      idempotencyKey: `idem:${executionId}`,
      payload: { action: input.action },
    });

    queueTimeline = deps.queueGovernance.timeline as unknown as Record<string, unknown>[];

    if (enqueueResult.outcome === "load_shed") {
      const queueSaturatedEvent = buildNautilusEvent({
        type: "queue.saturated",
        source: "queue-governance",
        executionId,
        correlationId: input.correlationId,
        status: "degraded",
        payload: { reason: "queue_saturated", backpressureReason: enqueueResult.degraded.backpressureReason },
      });
      deps.eventBus.emit(queueSaturatedEvent);
      degraded.push("queue_saturated");

      const proofpack = buildProofpack({
        executionId,
        correlationId: input.correlationId,
        events: [startedEvent, queueSaturatedEvent],
        degradedStates: degraded,
        queueTimeline,
      });
      deps.proofpackSink?.(proofpack);

      return {
        executionId,
        correlationId: input.correlationId,
        startedEvent,
        retrievalState: "unavailable",
        degraded,
        memoryRecorded: false,
        status: "queue_saturated",
        proofpackId: proofpack.id,
      };
    } else if (enqueueResult.outcome === "admitted") {
      deps.eventBus.emit(
        buildNautilusEvent({
          type: "queue.admitted",
          source: "queue-governance",
          executionId,
          correlationId: input.correlationId,
          status: "started",
          payload: { queueId: enqueueResult.item.queueId },
        })
      );
    }
  }

  const fingerprint = taskFingerprint({ objective: input.action, constraints: [], inputs: input.query ? [input.query] : [] });
  if (deps.reuseCache) {
    const reuse = reuseGuard(deps.reuseCache, fingerprint);
    if (reuse.reused) {
      const completedEvent = buildNautilusEvent({
        type: "execution.completed",
        source: "runtime",
        executionId,
        correlationId: input.correlationId,
        status: "completed",
        payload: { reused: true, runtimeResult: reuse.result },
      });
      deps.eventBus.emit(completedEvent);
      
      const proofpack = buildProofpack({
        executionId,
        correlationId: input.correlationId,
        events: [startedEvent, completedEvent],
        degradedStates: degraded,
        queueTimeline,
      });
      deps.proofpackSink?.(proofpack);
      return { executionId, correlationId: input.correlationId, startedEvent, completedEvent, retrievalState: "unavailable", degraded, memoryRecorded: false, traceId: input.correlationId, status: "completed", proofpackId: proofpack.id };
    }
  }

  const budgetCheck = estimateTokenBudget({ strings: [input.action, input.query ?? ""], budget: 8192 });
  if (budgetCheck.overBudget) {
    const overflowState = unavailableDegraded({ kind: "gpu", source: "token-budget", message: `token_budget_overflow: estimated ${budgetCheck.estimatedTokens} tokens exceeds budget of 8192`, at: new Date().toISOString() });
    degraded.push(`token_budget_overflow:${budgetCheck.estimatedTokens}`);
  }

  if (!deps.traceWriter) degraded.push("trace_store_unavailable");

  if (!deps.policyGate) {
    const degradedState = unavailableDegraded({ kind: "probe", source: "threatmesh", message: "policy_engine_unavailable", at: new Date().toISOString() });
    const deniedEvent = buildNautilusEvent({
      type: "policy.denied",
      source: "threatmesh",
      executionId,
      correlationId: input.correlationId,
      status: "denied",
      severity: "critical",
      payload: { reason: "policy_engine_unavailable", failClosed: true, degradedState },
    });
    deps.eventBus.emit(deniedEvent);
    degraded.push("policy_engine_unavailable");
    const proofpack = buildProofpack({
      executionId,
      correlationId: input.correlationId,
      events: [startedEvent, deniedEvent],
      degradedStates: degraded,
      queueTimeline,
    });
    deps.proofpackSink?.(proofpack);
    return {
      executionId,
      correlationId: input.correlationId,
      startedEvent,
      failedEvent: deniedEvent,
      retrievalState: "unavailable",
      degraded,
      memoryRecorded: false,
      status: "denied",
      proofpackId: proofpack.id,
    };
  }

  const policyDecision = deps.policyGate.evaluate(input.action, input.riskSignals ?? []);
  const policyDecisionRef = `policy:${executionId}:${Date.now()}`;
  deps.eventBus.emit(
    buildNautilusEvent({
      type: "policy.evaluated",
      source: "threatmesh",
      executionId,
      correlationId: input.correlationId,
      status: policyDecision.allowed ? "completed" : "denied",
      payload: { policyDecisionRef, allowed: policyDecision.allowed, reasons: policyDecision.reasons },
    }),
  );

  if (!policyDecision.allowed) {
    const deniedEvent = buildNautilusEvent({
      type: "policy.denied",
      source: "threatmesh",
      executionId,
      correlationId: input.correlationId,
      status: "denied",
      severity: "error",
      payload: { reason: "policy_denied", policyDecisionRef, reasons: policyDecision.reasons },
    });
    deps.eventBus.emit(deniedEvent);
    const proofpack = buildProofpack({
      executionId,
      correlationId: input.correlationId,
      events: [startedEvent, deniedEvent],
      degradedStates: degraded,
      queueTimeline,
    });
    deps.proofpackSink?.(proofpack);
    return {
      executionId,
      correlationId: input.correlationId,
      startedEvent,
      failedEvent: deniedEvent,
      policyDecisionRef,
      retrievalState: "unavailable",
      degraded,
      memoryRecorded: false,
      status: "denied",
      proofpackId: proofpack.id,
    };
  }

  let retrievalState: TruthLoopReport["retrievalState"] = "unavailable";
  let retrievalRef: string | undefined;
  let retrievalResult: RetrievalResult | undefined;
  if (deps.retriever && input.query) {
    const result = deps.retriever.retrieve({ id: `${executionId}:retrieval`, query: input.query, executionId });
    retrievalResult = result.result;
    retrievalRef = result.trace.replayToken;
    retrievalState = "completed";
  } else {
    degraded.push("retrieval_engine_unavailable");
  }

  try {
    const runtimeResult = await deps.runtime.run({ executionId, correlationId: input.correlationId });
    const completedEvent = buildNautilusEvent({
      type: "execution.completed",
      source: "runtime",
      executionId,
      correlationId: input.correlationId,
      status: "completed",
      payload: { policyDecisionRef, retrievalRef, runtimeResult, retrievalResult },
    });
    deps.eventBus.emit(completedEvent);

    let memoryRecorded = false;
    if (deps.memoryStore) {
      const memoryRecord = {
        id: `${executionId}:completion`,
        category: "execution_lineage" as const,
        createdAt: completedEvent.timestamp,
        provenanceEvent: {
          type: completedEvent.type,
          timestamp: completedEvent.timestamp,
          source: completedEvent.source,
          executionId,
          correlationId: input.correlationId,
        },
        data: completedEvent.payload,
      };
      deps.memoryStore.write(memoryRecord);
      memoryRecords.push(memoryRecord);
      memoryRecorded = true;
    } else {
      degraded.push("memory_store_unavailable");
    }

    let checkpointRef: string | undefined;
    if (deps.checkpointStore) {
      const cp: CheckpointState = { runId: input.correlationId, taskId: executionId, status: "completed", checkpointAt: completedEvent.timestamp, replayCursor: completedEvent.timestamp };
      checkpointRef = saveCheckpoint(cp);
      deps.checkpointStore.set(executionId, checkpointRef);
    }

    const proofpack = buildProofpack({
      executionId,
      correlationId: input.correlationId,
      events: [startedEvent, completedEvent],
      memoryRecords,
      degradedStates: degraded,
      queueTimeline,
      checkpointRef,
    });
    deps.proofpackSink?.(proofpack);

    return { executionId, correlationId: input.correlationId, startedEvent, completedEvent, policyDecisionRef, retrievalRef, retrievalState, degraded, memoryRecorded, traceId: input.correlationId, status: "completed", proofpackId: proofpack.id };
  } catch (error) {
    const failedEvent = buildNautilusEvent({
      type: "execution.failed",
      source: "runtime",
      executionId,
      correlationId: input.correlationId,
      status: "failed",
      severity: "error",
      payload: { reason: error instanceof Error ? error.message : String(error), policyDecisionRef, retrievalRef },
    });
    deps.eventBus.emit(failedEvent);

    if (deps.queueGovernance) {
      try {
        const queueId = `queue:${executionId}`;
        const retryItem = deps.queueGovernance.markRetry(queueId);
        queueTimeline = deps.queueGovernance.timeline as unknown as Record<string, unknown>[];
        if (retryItem.status === "dead_letter") {
          degraded.push("dead_letter_queue");
        }
      } catch {
        degraded.push("queue_retry_tracking_failed");
      }
    }

    let checkpointRef: string | undefined;
    let replayMetadata: Record<string, unknown> | undefined;
    if (deps.checkpointStore) {
      const existing = deps.checkpointStore.get(executionId);
      if (existing) {
        checkpointRef = `stale:${existing}`;
        try {
          const loaded = loadCheckpoint(existing);
          const replayed = replayCheckpoint(loaded);
          replayMetadata = { replayed, continuityFrom: loaded.replayCursor };
        } catch {
          degraded.push("checkpoint_corrupt");
        }
      }
    }

    const proofpack = buildProofpack({
      executionId,
      correlationId: input.correlationId,
      events: [startedEvent, failedEvent],
      degradedStates: degraded,
      queueTimeline,
      checkpointRef,
    });
    deps.proofpackSink?.(proofpack);

    return { executionId, correlationId: input.correlationId, startedEvent, failedEvent, policyDecisionRef, retrievalRef, retrievalState, degraded, memoryRecorded: false, traceId: input.correlationId, status: "failed", proofpackId: proofpack.id };
  }
}
