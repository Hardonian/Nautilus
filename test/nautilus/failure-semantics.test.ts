// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { failureSemantics } from '../../src/lib/nautilus/failure-semantics';

describe('failure semantics matrix', () => {
  it('covers required fail-closed and explicit degraded conditions', () => {
    expect(failureSemantics.policy_engine_unavailable.failBehavior).toBe('closed');
    expect(failureSemantics.runtime_unavailable.visibleState).toBe('degraded');
    expect(failureSemantics.retrieval_unavailable.visibleState).toBe('degraded');
    expect(failureSemantics.memory_store_unavailable.memoryBehavior).toContain('lineage gap');
    expect(failureSemantics.proofpack_generation_unavailable.event).toBe('proofpack.unavailable');
    expect(failureSemantics.gpu_telemetry_stale.event).not.toBe(failureSemantics.gpu_telemetry_unavailable.event);
  });

  it('includes coverage markers and artifact behaviors', () => {
    for (const semantics of Object.values(failureSemantics)) {
      expect(semantics.coverageMarker).toContain('nautilus.failure.');
      expect(semantics.traceBehavior.length).toBeGreaterThan(5);
      expect(semantics.memoryBehavior.length).toBeGreaterThan(5);
      expect(semantics.proofpackBehavior.length).toBeGreaterThan(5);
    }
  });
});
