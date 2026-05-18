// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { legalTransitions, type ExecutionState } from '../../../contracts/nautilus/index';

export class IllegalStateTransitionError extends Error {
  constructor(from: ExecutionState, to: ExecutionState) {
    super(`Illegal execution transition: ${from} -> ${to}`);
  }
}

export interface StateTransitionEvent {
  type: 'execution.state_transition';
  from: ExecutionState;
  to: ExecutionState;
  replayCompatible: true;
  timestampUtc: string;
}

export function transitionExecutionState(from: ExecutionState, to: ExecutionState): StateTransitionEvent {
  if (!legalTransitions[from].includes(to)) {
    throw new IllegalStateTransitionError(from, to);
  }
  return {
    type: 'execution.state_transition',
    from,
    to,
    replayCompatible: true,
    timestampUtc: new Date().toISOString(),
  };
}
