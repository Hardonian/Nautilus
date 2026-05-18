// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { validateNautilusEvent } from '../core/event-fabric/contracts';

describe('core/event-fabric/contracts', () => {
  it('accepts canonical memory.recorded event with lineage metadata', () => {
    const valid = validateNautilusEvent({
      type: 'memory.recorded',
      at: new Date().toISOString(),
      runId: 'run-1',
      pillar: 'recallforge',
      severity: 'info',
      correlationId: 'corr-1',
      state: 'completed',
      payload: { provenance: 'trace.recorded' },
    });

    expect(valid).toBe(true);
  });

  it('rejects non-canonical event type', () => {
    const valid = validateNautilusEvent({
      type: 'memory.learned',
      at: new Date().toISOString(),
      runId: 'run-2',
      pillar: 'recallforge',
      severity: 'info',
      payload: {},
    });

    expect(valid).toBe(false);
  });
});
