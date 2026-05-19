// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { transitionExecutionState } from '../../src/lib/nautilus/state-machine';

describe('execution state machine', () => {
  it('validates legal transitions from every non-terminal state', () => {
    const executionId = 'exec-1';
    expect(transitionExecutionState('queued', 'planning', { executionId, reason: 'ok' }).to).toBe('planning');
    expect(transitionExecutionState('planning', 'policy_evaluation', { executionId, reason: 'ok' }).to).toBe('policy_evaluation');
    expect(transitionExecutionState('policy_evaluation', 'retrieval', { executionId, reason: 'ok' }).to).toBe('retrieval');
    expect(transitionExecutionState('retrieval', 'executing', { executionId, reason: 'ok' }).to).toBe('executing');
    expect(transitionExecutionState('executing', 'fallback', { executionId, reason: 'degraded' }).to).toBe('fallback');
    expect(transitionExecutionState('fallback', 'degraded', { executionId, reason: 'degraded' }).to).toBe('degraded');
    expect(transitionExecutionState('degraded', 'completed', { executionId, reason: 'done' }).to).toBe('completed');
    expect(transitionExecutionState('replaying', 'completed', { executionId, reason: 'replay completed' }).to).toBe('completed');
  });

  it('rejects illegal and terminal transitions', () => {
    expect(() => transitionExecutionState('queued', 'completed', { executionId: 'e', reason: 'x' })).toThrow();
    expect(() => transitionExecutionState('completed', 'executing', { executionId: 'e', reason: 'x' })).toThrow();
    expect(() => transitionExecutionState('failed', 'replaying', { executionId: 'e', reason: 'x' })).toThrow();
    expect(() => transitionExecutionState('cancelled', 'planning', { executionId: 'e', reason: 'x' })).toThrow();
  });

  it('emits required payload fields', () => {
    const event = transitionExecutionState('queued', 'planning', { executionId: 'exec-2', reason: 'accepted', correlationId: 'corr-1', timestamp: '2026-05-18T00:00:00.000Z' });
    expect(event).toMatchObject({ executionId: 'exec-2', from: 'queued', to: 'planning', reason: 'accepted', correlationId: 'corr-1', schemaVersion: '1.0.0', timestamp: '2026-05-18T00:00:00.000Z' });
  });
});
