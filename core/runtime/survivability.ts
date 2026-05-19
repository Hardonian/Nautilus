// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type RecoveryState = 'recovered' | 'degraded' | 'orphaned' | 'partial' | 'unavailable';
export type DurableExecutionState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionSnapshot {
  runId: string;
  state: DurableExecutionState;
  updatedAt: string;
  hasTerminalEvent: boolean;
}

export interface ReconciledExecution {
  runId: string;
  recoveryState: RecoveryState;
  replayContinuity: 'continuous' | 'partial';
  action: 'resume' | 'mark_orphaned' | 'keep_terminal' | 'mark_partial';
  notes: string[];
}

export function reconcileStartupState(snapshots: ExecutionSnapshot[], nowIso: string, orphanAfterMs: number): ReconciledExecution[] {
  const now = Date.parse(nowIso);
  return snapshots.map((snapshot) => {
    const ageMs = now - Date.parse(snapshot.updatedAt);
    if (['completed', 'failed', 'cancelled'].includes(snapshot.state)) {
      return { runId: snapshot.runId, recoveryState: 'recovered', replayContinuity: 'continuous', action: 'keep_terminal', notes: ['terminal_state_preserved'] };
    }
    if (!snapshot.hasTerminalEvent && ageMs > orphanAfterMs) {
      return { runId: snapshot.runId, recoveryState: 'orphaned', replayContinuity: 'partial', action: 'mark_orphaned', notes: ['orphan_execution_requires_operator_visibility'] };
    }
    if (!snapshot.hasTerminalEvent) {
      return { runId: snapshot.runId, recoveryState: 'partial', replayContinuity: 'partial', action: 'mark_partial', notes: ['startup_reconciliation_found_interrupted_execution'] };
    }
    return { runId: snapshot.runId, recoveryState: 'degraded', replayContinuity: 'continuous', action: 'resume', notes: ['non_terminal_execution_has_replay_evidence'] };
  });
}
