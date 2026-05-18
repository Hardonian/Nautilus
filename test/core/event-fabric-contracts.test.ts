// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
  CANONICAL_EVENT_TYPES,
  isCanonicalEventType,
  validateNautilusEvent,
} from '../../core/event-fabric/contracts';

describe('nautilus canonical event fabric contracts', () => {
  it('has required canonical event names', () => {
    expect(CANONICAL_EVENT_TYPES).toContain('execution.started');
    expect(CANONICAL_EVENT_TYPES).toContain('runtime.degraded');
    expect(CANONICAL_EVENT_TYPES).toContain('runtime.restored');
  });

  it('validates canonical types', () => {
    expect(isCanonicalEventType('execution.completed')).toBe(true);
    expect(isCanonicalEventType('not.real')).toBe(false);
  });

  it('validates full event envelope', () => {
    const event = {
      type: 'execution.started',
      at: new Date().toISOString(),
      runId: 'run-123',
      pillar: 'runtime',
      severity: 'info',
      payload: { route: 'local' },
    };

    expect(validateNautilusEvent(event)).toBe(true);
    expect(validateNautilusEvent({ ...event, type: 'fake.event' })).toBe(false);
  });
});
