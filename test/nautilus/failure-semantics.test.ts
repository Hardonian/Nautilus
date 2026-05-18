// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { failureSemantics } from '../../src/lib/nautilus/failure-semantics';

describe('failure semantics matrix', () => {
  it('fails closed on policy and event validation outages', () => {
    expect(failureSemantics.policy_engine_unavailable.failBehavior).toBe('closed');
    expect(failureSemantics.event_validation_failure.failBehavior).toBe('closed');
  });

  it('explicitly marks degraded telemetry conditions', () => {
    expect(failureSemantics.gpu_telemetry_stale.visibleState).toBe('degraded');
  });
});
