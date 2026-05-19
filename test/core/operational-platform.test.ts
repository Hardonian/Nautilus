// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { classifyMetricTruth } from '../../core/event-fabric/observability';
import { buildProofpackManifest } from '../../core/event-fabric/proofpack';
import { buildReplay } from '../../core/event-fabric/replay';
import { classifyRetrieval } from '../../core/meshrag/retrieval';
import { validateRecommendationEvidence } from '../../core/operatorgraph/recommendations';
import { classifyTopology } from '../../core/operatorgraph/topology';
import { classifyRetention } from '../../core/recallforge/retention';
import { classifyRuntimeAvailability } from '../../core/runtime/health';
import { reconcileStartupState } from '../../core/runtime/survivability';
import { evaluateGovernance } from '../../core/threatmesh/governance';

const baseEvent = {
  at: '2026-05-18T00:00:00.000Z',
  pillar: 'runtime',
  runId: 'run-1',
  severity: 'info',
  payload: {},
} as const;

describe('Nautilus operational platform primitives', () => {
  it('preserves replay integrity and exposes partial replay gaps', () => {
    const complete = buildReplay([
      { ...baseEvent, sequence: 1, type: 'execution.started' },
      { ...baseEvent, sequence: 2, type: 'execution.completed' },
    ]);
    expect(complete.status).toBe('complete');
    expect(complete.integrityHash).toHaveLength(64);

    const partial = buildReplay([{ ...baseEvent, sequence: 1, type: 'execution.started' }], 3);
    expect(partial.status).toBe('partial');
    expect(partial.gaps).toEqual([2, 3]);
    expect(partial.notes).toContain('interrupted_trace_without_terminal_event');
  });

  it('marks interrupted or missing proofpacks partial or incomplete instead of successful', () => {
    const partial = buildProofpackManifest({
      evidence: [{ contentHash: 'abc', id: 'trace-1', required: true }],
      id: 'proof-1',
      interrupted: true,
      policyReplayRef: 'policy-replay-1',
      replayRef: 'replay-1',
    });
    expect(partial.status).toBe('partial');
    expect(partial.notes).toContain('interrupted_proofpack_marked_partial');

    const incomplete = buildProofpackManifest({
      evidence: [{ contentHash: '', id: 'trace-2', required: true }],
      id: 'proof-2',
      policyReplayRef: '',
      replayRef: 'replay-2',
    });
    expect(incomplete.status).toBe('incomplete');
    expect(incomplete.missingRequiredEvidence).toEqual(['trace-2']);
    expect(incomplete.notes).toContain('missing_policy_replay_reference');
  });

  it('reconciles startup state for orphan and partial execution recovery', () => {
    const reconciled = reconcileStartupState(
      [
        {
          hasTerminalEvent: false,
          runId: 'old-running',
          state: 'running',
          updatedAt: '2026-05-18T00:00:00.000Z',
        },
        {
          hasTerminalEvent: false,
          runId: 'recent-running',
          state: 'running',
          updatedAt: '2026-05-18T00:09:59.000Z',
        },
        {
          hasTerminalEvent: true,
          runId: 'done',
          state: 'completed',
          updatedAt: '2026-05-18T00:00:00.000Z',
        },
      ],
      '2026-05-18T00:10:00.000Z',
      60_000,
    );
    expect(reconciled.map((item) => item.recoveryState)).toEqual(['orphaned', 'partial', 'recovered']);
    expect(reconciled[0].replayContinuity).toBe('partial');
  });

  it('classifies runtime unavailable and degraded adapter states truthfully', () => {
    expect(classifyRuntimeAvailability([])).toEqual({
      reasons: ['no_runtime_probes'],
      status: 'unavailable',
    });
    expect(
      classifyRuntimeAvailability([
        { adapter: 'local', reachable: true },
        { adapter: 'gpu', reachable: false, reason: 'gpu_probe_failed' },
      ]).status,
    ).toBe('degraded');
  });

  it('flags stale topology nodes and storage retention transitions', () => {
    expect(
      classifyTopology(
        [
          { dependencies: [], id: 'fresh', lastSeenAt: '2026-05-18T00:09:30.000Z' },
          { dependencies: [], id: 'stale', lastSeenAt: '2026-05-18T00:00:00.000Z' },
          { dependencies: [], id: 'missing' },
        ],
        '2026-05-18T00:10:00.000Z',
        60_000,
      ),
    ).toEqual({ fresh: 'current', missing: 'unavailable', stale: 'stale' });
    expect(classifyRetention({ createdAt: '2026-05-18T00:00:00.000Z', id: 'r1' }, '2026-05-18T00:10:00.000Z', 60_000, 600_000)).toBe('archive_cold');
    expect(classifyRetention({ createdAt: '2026-05-18T00:00:00.000Z', id: 'r2', immutableEvidence: true }, '2026-05-18T00:10:00.000Z', 60_000, 600_000)).toBe('retain_immutable');
  });

  it('fails closed for governance and requires policy replay references', () => {
    expect(
      evaluateGovernance({
        allowedActions: ['read'],
        policyLoaded: false,
        replayRef: 'policy-replay-1',
        requestedAction: 'read',
      }),
    ).toEqual({ decision: 'deny', reason: 'policy_unavailable_fail_closed' });
    expect(
      evaluateGovernance({
        allowedActions: ['read'],
        policyLoaded: true,
        requestedAction: 'read',
      }),
    ).toEqual({ decision: 'deny', reason: 'missing_policy_replay_reference' });
  });

  it('returns degraded retrieval, timeout retrieval, and evidence-backed recommendations', () => {
    expect(
      classifyRetrieval([
        { evidenceIds: ['e1'], ok: true, shard: 'hot' },
        { evidenceIds: [], ok: false, shard: 'warm' },
      ]),
    ).toEqual({ degradedShards: ['warm'], evidenceIds: ['e1'], status: 'degraded' });
    expect(classifyRetrieval([{ evidenceIds: [], ok: false, shard: 'cold', timedOut: true }]).status).toBe('timeout');

    expect(validateRecommendationEvidence({ evidenceIds: ['e1'], id: 'rec-1', text: 'restart' }, ['e1']).ok).toBe(true);
    expect(validateRecommendationEvidence({ evidenceIds: ['e2'], id: 'rec-2', text: 'restart' }, ['e1'])).toEqual({
      missingEvidenceIds: ['e2'],
      ok: false,
    });
  });

  it('classifies observability metric truth without inventing healthy telemetry', () => {
    expect(classifyMetricTruth({ name: 'queue_depth', source: 'runtime', value: 2 })).toBe('observed');
    expect(classifyMetricTruth({ derivedFrom: ['event-1'], name: 'replay_latency', source: 'replay', value: 10 })).toBe('derived');
    expect(classifyMetricTruth({ name: 'gpu_temp' })).toBe('unavailable');
    expect(classifyMetricTruth({ name: 'placeholder', value: 0 })).toBe('scaffolded');
  });
});
