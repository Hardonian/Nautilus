// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { transitionExecutionState } from '../../src/lib/nautilus/state-machine';

describe('execution state machine', () => {
  it('allows legal transition', () => {
    const event = transitionExecutionState('queued', 'planning');
    expect(event.type).toBe('execution.state_transition');
  });

  it('rejects illegal transition', () => {
    expect(() => transitionExecutionState('queued', 'completed')).toThrow(/Illegal execution transition/);
  });
});
