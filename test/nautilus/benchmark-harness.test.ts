// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { runBenchmarkHarness } from '../../src/lib/control-plane/r5-proofpack-release';

describe('Benchmark harness', () => {
  it('returns unavailable when runtime is not available', async () => {
    const result = await runBenchmarkHarness({ runtimeAvailable: false, reasonIfUnavailable: 'no_runtime_node' });
    expect(result.status).toBe('unavailable');
    expect(result.reason).toBe('no_runtime_node');
  });

  it('returns unavailable when callable is not provided', async () => {
    const result = await runBenchmarkHarness({ runtimeAvailable: true });
    expect(result.status).toBe('unavailable');
    expect(result.reason).toBe('runtime_adapter_unavailable');
  });

  it('measures latency around callable', async () => {
    const result = await runBenchmarkHarness({
      runtimeAvailable: true,
      callable: () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      },
    });
    expect(result.status).toBe('ok');
    expect('latencyMs' in result).toBe(true);
    expect((result as any).latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns deterministic output shape', async () => {
    const ok = await runBenchmarkHarness({ runtimeAvailable: true, callable: () => {} });
    const unavailable = await runBenchmarkHarness({ runtimeAvailable: false, reasonIfUnavailable: 'test' });

    expect(ok).toHaveProperty('status');
    expect(ok).toHaveProperty('latencyMs');
    expect(unavailable).toHaveProperty('status');
    expect(unavailable).toHaveProperty('reason');
    expect((unavailable as any).status).toBe('unavailable');
  });
});
