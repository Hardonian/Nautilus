// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { ExecutionQueueOverflowError, RuntimeExecutionEngine } from '../../core/runtime/execution-engine';

describe('RuntimeExecutionEngine', () => {
  it('emits retry evidence and succeeds', async () => {
    const engine = new RuntimeExecutionEngine(2);
    let calls = 0;
    const out = await engine.execute({ runId: 'r1', timeoutMs: 100, retries: 1, backoffMs: 1, async handler() { calls += 1; if (calls === 1) throw new Error('boom'); return 'ok'; } });
    expect(out).toBe('ok');
    expect(engine.getEvents().some((e) => e.kind === 'execution.retry_scheduled')).toBe(true);
  });

  it('cancellation is replay-visible', async () => {
    const engine = new RuntimeExecutionEngine(1);
    const ctl = new AbortController();
    const p = engine.execute({ runId: 'r2', timeoutMs: 1000, retries: 0, backoffMs: 1, async handler({ signal }) { await new Promise((_, rej)=> signal.addEventListener('abort', ()=> rej(new Error('cancelled')))); return 'x'; } }, ctl.signal);
    ctl.abort();
    await expect(p).rejects.toThrow();
    expect(engine.getEvents().map((e) => e.kind)).toContain('execution.cancelled');
  });

  it('enforces bounded queue', async () => {
    const engine = new RuntimeExecutionEngine(1);
    const p1 = engine.execute({ runId: 'r3', timeoutMs: 100, retries: 0, backoffMs: 1, async handler() { await new Promise((r) => setTimeout(r, 30)); return 'ok'; } });
    await expect(engine.execute({ runId: 'r4', timeoutMs: 100, retries: 0, backoffMs: 1, async handler() { return 'ok'; } })).rejects.toBeInstanceOf(ExecutionQueueOverflowError);
    await p1;
  });
});
