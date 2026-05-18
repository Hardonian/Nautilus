// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type ExecutionLifecycleState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
export type ExecutionEventKind =
  | 'execution.queued'
  | 'execution.started'
  | 'execution.retry_scheduled'
  | 'execution.cancel_requested'
  | 'execution.cancelled'
  | 'execution.timeout'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.queue_overflow';

export interface ExecutionEventRecord {
  runId: string;
  kind: ExecutionEventKind;
  at: string;
  attempt: number;
  detail?: string;
}

export interface ExecutionContext {
  signal: AbortSignal;
  runId: string;
  attempt: number;
  deadlineAt: number;
}

export interface ExecutionTask<T> {
  runId: string;
  timeoutMs: number;
  retries: number;
  backoffMs: number;
  deadlineAt?: number;
  handler: (ctx: ExecutionContext) => Promise<T>;
  cleanup?: (ctx: ExecutionContext, state: ExecutionLifecycleState) => Promise<void> | void;
}

export class ExecutionQueueOverflowError extends Error {}

export class RuntimeExecutionEngine {
  private readonly maxQueue: number;
  private readonly events: ExecutionEventRecord[] = [];
  private pending = 0;

  public constructor(maxQueue: number) {
    this.maxQueue = maxQueue;
  }

  public getEvents(): ExecutionEventRecord[] {
    return [...this.events];
  }

  public async execute<T>(task: ExecutionTask<T>, externalSignal?: AbortSignal): Promise<T> {
    if (this.pending >= this.maxQueue) {
      this.emit(task.runId, 'execution.queue_overflow', 0, 'bounded_queue_limit');
      throw new ExecutionQueueOverflowError(`queue overflow for run ${task.runId}`);
    }
    this.pending += 1;
    let state: ExecutionLifecycleState = 'queued';
    this.emit(task.runId, 'execution.queued', 0);

    const deadlineAt = task.deadlineAt ?? Date.now() + task.timeoutMs * (task.retries + 1);
    try {
      for (let attempt = 1; attempt <= task.retries + 1; attempt += 1) {
        const ctl = new AbortController();
        const signal = ctl.signal;
        const timeout = setTimeout(() => ctl.abort(new Error('timeout')), task.timeoutMs);
        const listener = () => ctl.abort(new Error('cancelled'));
        externalSignal?.addEventListener('abort', listener, { once: true });

        this.emit(task.runId, 'execution.started', attempt);
        state = 'running';
        try {
          const result = await task.handler({ signal, runId: task.runId, attempt, deadlineAt });
          clearTimeout(timeout);
          externalSignal?.removeEventListener('abort', listener);
          this.emit(task.runId, 'execution.completed', attempt);
          state = 'completed';
          return result;
        } catch (error) {
          clearTimeout(timeout);
          externalSignal?.removeEventListener('abort', listener);
          const msg = String((error as Error)?.message ?? error);
          if (msg.includes('cancelled')) {
            this.emit(task.runId, 'execution.cancel_requested', attempt, 'propagated_abort');
            this.emit(task.runId, 'execution.cancelled', attempt, 'replay_visible_cancel');
            state = 'cancelled';
            throw error;
          }
          if (msg.includes('timeout')) {
            this.emit(task.runId, 'execution.timeout', attempt, 'execution_timeout');
            state = 'timed_out';
          }
          if (attempt <= task.retries) {
            this.emit(task.runId, 'execution.retry_scheduled', attempt, 'explicit_retry_evidence');
            await new Promise((resolve) => setTimeout(resolve, task.backoffMs * attempt));
            continue;
          }
          this.emit(task.runId, 'execution.failed', attempt, msg);
          state = state === 'timed_out' ? 'timed_out' : 'failed';
          throw error;
        }
      }
      throw new Error('unreachable');
    } finally {
      this.pending -= 1;
      await task.cleanup?.({ signal: new AbortController().signal, runId: task.runId, attempt: 0, deadlineAt }, state);
    }
  }

  private emit(runId: string, kind: ExecutionEventKind, attempt: number, detail?: string): void {
    this.events.push({ runId, kind, at: new Date().toISOString(), attempt, detail });
  }
}
