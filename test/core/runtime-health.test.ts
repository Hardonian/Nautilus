// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { classifyRuntimeAvailability, RuntimeProbe } from '../../core/runtime/health';

describe('classifyRuntimeAvailability', () => {
  it('returns unavailable when no runtime probes are provided', () => {
    const result = classifyRuntimeAvailability([]);
    expect(result).toEqual({ status: 'unavailable', reasons: ['no_runtime_probes'] });
  });

  it('returns available when all probes are reachable and not degraded', () => {
    const probes: RuntimeProbe[] = [
      { adapter: 'adapter1', reachable: true },
      { adapter: 'adapter2', reachable: true, degraded: false }
    ];
    const result = classifyRuntimeAvailability(probes);
    expect(result).toEqual({ status: 'available', reasons: [] });
  });

  it('returns unavailable when all probes are unreachable', () => {
    const probes: RuntimeProbe[] = [
      { adapter: 'adapter1', reachable: false, reason: 'conn_refused' },
      { adapter: 'adapter2', reachable: false }
    ];
    const result = classifyRuntimeAvailability(probes);
    expect(result).toEqual({
      status: 'unavailable',
      reasons: ['conn_refused', 'adapter2_unreachable']
    });
  });

  it('returns degraded when there is a mix of reachable and unreachable probes', () => {
    const probes: RuntimeProbe[] = [
      { adapter: 'adapter1', reachable: true },
      { adapter: 'adapter2', reachable: false, reason: 'timeout' }
    ];
    const result = classifyRuntimeAvailability(probes);
    expect(result).toEqual({
      status: 'degraded',
      reasons: ['timeout']
    });
  });

  it('returns degraded when there are degraded reachable probes', () => {
    const probes: RuntimeProbe[] = [
      { adapter: 'adapter1', reachable: true, degraded: true, reason: 'slow' },
      { adapter: 'adapter2', reachable: true }
    ];
    const result = classifyRuntimeAvailability(probes);
    expect(result).toEqual({
      status: 'degraded',
      reasons: ['slow']
    });
  });

  it('combines unreachable and degraded reasons when returning degraded', () => {
    const probes: RuntimeProbe[] = [
      { adapter: 'adapter1', reachable: false, reason: 'offline' },
      { adapter: 'adapter2', reachable: true, degraded: true },
      { adapter: 'adapter3', reachable: true }
    ];
    const result = classifyRuntimeAvailability(probes);
    expect(result).toEqual({
      status: 'degraded',
      reasons: ['offline', 'adapter2_degraded']
    });
  });
});
