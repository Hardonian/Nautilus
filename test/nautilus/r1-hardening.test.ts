// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeEach } from 'vitest';
import { boundedRetry, denyRemoteByDefault, unavailableDegraded, CleanupRegistry } from '../../src/lib/control-plane/r1-hardening';

describe('R1 hardening integration', () => {
  describe('boundedRetry', () => {
    it('succeeds on first attempt', async () => {
      const result = await boundedRetry(() => 'ok', { maxAttempts: 3, maxTotalMs: 1000, backoffMs: 10 });
      expect(result.ok).toBe(true);
      expect(result.attempts).toBe(1);
      if (result.ok) expect(result.value).toBe('ok');
    });

    it('succeeds after retries', async () => {
      let attempts = 0;
      const result = await boundedRetry(() => {
        attempts += 1;
        if (attempts < 3) throw new Error('transient');
        return 'recovered';
      }, { maxAttempts: 5, maxTotalMs: 5000, backoffMs: 5 });
      expect(result.ok).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it('bounded by maxAttempts', async () => {
      const result = await boundedRetry(() => { throw new Error('always'); }, { maxAttempts: 2, maxTotalMs: 10000, backoffMs: 1 });
      expect(result.ok).toBe(false);
      expect(result.attempts).toBe(2);
    });

    it('bounded by maxTotalMs', async () => {
      const result = await boundedRetry(() => { throw new Error('slow'); }, { maxAttempts: 100, maxTotalMs: 10, backoffMs: 5 });
      expect(result.ok).toBe(false);
      expect(result.attempts).toBeLessThanOrEqual(3);
    });
  });

  describe('denyRemoteByDefault', () => {
    it('denies remote by default', () => {
      const result = denyRemoteByDefault({});
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('remote_execution_disabled_by_default');
    });

    it('denies untrusted remote', () => {
      const result = denyRemoteByDefault({ allowRemoteExecution: true, trustAttested: false });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('remote_execution_denied_untrusted');
    });

    it('allows when explicitly enabled and trusted', () => {
      const result = denyRemoteByDefault({ allowRemoteExecution: true, trustAttested: true });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('unavailableDegraded', () => {
    it('produces degraded state for runtime unavailable', () => {
      const state = unavailableDegraded({ kind: 'runtime', source: 'probe', message: 'no runtime found' });
      expect(state.state).toBe('degraded');
      expect(state.reasonCode).toBe('runtime_unavailable');
      expect(state.source).toBe('probe');
      expect(state.at).toBeTruthy();
    });

    it('produces degraded state for model unavailable', () => {
      const state = unavailableDegraded({ kind: 'model', source: 'scheduler', message: 'model not found' });
      expect(state.reasonCode).toBe('model_unavailable');
    });

    it('produces degraded state for gpu unavailable', () => {
      const state = unavailableDegraded({ kind: 'gpu', source: 'probe', message: 'no GPU' });
      expect(state.reasonCode).toBe('gpu_unavailable');
    });

    it('produces degraded state for probe unavailable', () => {
      const state = unavailableDegraded({ kind: 'probe', source: 'health', message: 'probe failed' });
      expect(state.reasonCode).toBe('probe_unavailable');
    });
  });

  describe('CleanupRegistry', () => {
    it('executes each cleanup exactly once', async () => {
      const registry = new CleanupRegistry();
      let callCount = 0;
      registry.register(() => { callCount += 1; });
      registry.register(() => { callCount += 1; });

      await registry.runOnce();
      expect(callCount).toBe(2);

      await registry.runOnce();
      expect(callCount).toBe(2);
    });

    it('handles async cleanup functions', async () => {
      const registry = new CleanupRegistry();
      let asyncCount = 0;
      registry.register(async () => { asyncCount += 1; });
      await registry.runOnce();
      expect(asyncCount).toBe(1);
    });
  });
});
