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

  it('emits dead-letter event when retries are exhausted', async () => {
    const engine = new RuntimeExecutionEngine(5);
    try {
      await engine.execute({
        runId: 'dl-test', timeoutMs: 100, retries: 2, backoffMs: 1,
        async handler() { throw new Error('persistent failure'); },
      });
    } catch { /* expected */ }

    const deadLetterEvents = engine.getEvents().filter((e) => e.kind === 'execution.dead_letter');
    expect(deadLetterEvents).toHaveLength(1);
    expect(deadLetterEvents[0]!.detail).toContain('retry_exhausted');
    expect(deadLetterEvents[0]!.detail).toContain('attempts=3');
    expect(deadLetterEvents[0]!.detail).toContain('max=3');
  });

  it('emits timing event on successful execution', async () => {
    const engine = new RuntimeExecutionEngine(5);
    await engine.execute({
      runId: 'timing-ok', timeoutMs: 1000, retries: 0, backoffMs: 1,
      async handler() { return 42; },
    });

    const timingEvents = engine.getEvents().filter((e) => e.kind === 'execution.timing');
    expect(timingEvents).toHaveLength(1);
    expect(timingEvents[0]!.detail).toMatch(/totalMs=\d+/);
    expect(timingEvents[0]!.detail).toContain('state=completed');
  });

  it('emits timing event on failed execution', async () => {
    const engine = new RuntimeExecutionEngine(5);
    try {
      await engine.execute({
        runId: 'timing-fail', timeoutMs: 100, retries: 0, backoffMs: 1,
        async handler() { throw new Error('boom'); },
      });
    } catch { /* expected */ }

    const timingEvents = engine.getEvents().filter((e) => e.kind === 'execution.timing');
    expect(timingEvents).toHaveLength(1);
    expect(timingEvents[0]!.detail).toContain('state=failed');
  });

  it('tracks peak pending tasks across concurrent executions', async () => {
    const engine = new RuntimeExecutionEngine(10);
    const tasks = Array.from({ length: 5 }, (_, i) =>
      engine.execute({
        runId: `peak-${i}`, timeoutMs: 200, retries: 0, backoffMs: 1,
        async handler() { await new Promise((r) => setTimeout(r, 20)); return 'ok'; },
      }),
    );
    await Promise.all(tasks);

    expect(engine.getPeakPending()).toBeGreaterThanOrEqual(2);
    expect(engine.getPeakPending()).toBeLessThanOrEqual(5);
  });

  it('reports zero queue pressure when idle', () => {
    const engine = new RuntimeExecutionEngine(10);
    expect(engine.getQueuePressure()).toBe(0);
  });

  it('includes capacity detail in overflow event', async () => {
    const engine = new RuntimeExecutionEngine(1);
    const p1 = engine.execute({
      runId: 'hold', timeoutMs: 200, retries: 0, backoffMs: 1,
      async handler() { await new Promise((r) => setTimeout(r, 50)); return 'ok'; },
    });

    try {
      await engine.execute({
        runId: 'overflow', timeoutMs: 100, retries: 0, backoffMs: 1,
        async handler() { return 'ok'; },
      });
    } catch { /* expected */ }

    await p1;

    const overflowEvent = engine.getEvents().find((e) => e.kind === 'execution.queue_overflow');
    expect(overflowEvent).toBeDefined();
    expect(overflowEvent!.detail).toContain('pending=1');
    expect(overflowEvent!.detail).toContain('max=1');
  });
});
