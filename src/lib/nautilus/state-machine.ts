// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SCHEMA_VERSION, type ExecutionState } from '../../../contracts/nautilus/index';

const legalTransitions: Record<ExecutionState, ExecutionState[]> = {
  queued: ['planning', 'cancelled'],
  planning: ['policy_evaluation', 'failed', 'cancelled'],
  policy_evaluation: ['retrieval', 'failed', 'degraded', 'cancelled'],
  retrieval: ['executing', 'fallback', 'degraded', 'failed', 'cancelled'],
  executing: ['completed', 'failed', 'fallback', 'degraded', 'cancelled'],
  fallback: ['executing', 'degraded', 'failed', 'cancelled'],
  degraded: ['executing', 'completed', 'failed', 'cancelled'],
  replaying: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

export class IllegalStateTransitionError extends Error {
  constructor(from: ExecutionState, to: ExecutionState) {
    super(`Illegal execution transition: ${from} -> ${to}`);
  }
}

export interface StateTransitionEvent {
  type: 'execution.state_transition';
  executionId: string;
  from: ExecutionState;
  to: ExecutionState;
  reason: string;
  correlationId?: string;
  schemaVersion: string;
  replayCompatible: true;
  timestamp: string;
}

export interface TransitionOptions {
  executionId: string;
  reason: string;
  correlationId?: string;
  timestamp?: string;
}

export function transitionExecutionState(from: ExecutionState, to: ExecutionState, options: TransitionOptions): StateTransitionEvent {
  if (!legalTransitions[from].includes(to)) {
    throw new IllegalStateTransitionError(from, to);
  }
  return {
    type: 'execution.state_transition',
    executionId: options.executionId,
    from,
    to,
    reason: options.reason,
    correlationId: options.correlationId,
    schemaVersion: SCHEMA_VERSION,
    replayCompatible: true,
    timestamp: options.timestamp ?? new Date().toISOString(),
  };
}
