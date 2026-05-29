// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface DegradedUnavailableState {
  state: "degraded";
  reasonCode: "runtime_unavailable" | "model_unavailable" | "gpu_unavailable" | "probe_unavailable" | "queue_saturation" | "token_overflow" | "policy_unavailable" | "replay_unavailable" | "checkpoint_unavailable";
  message: string;
  source: string;
  at: string;
}

export async function boundedRetry<T>(
  run: (attempt: number) => Promise<T> | T,
  input: { maxAttempts: number; maxTotalMs: number; backoffMs: number },
): Promise<{ ok: true; attempts: number; value: T } | { ok: false; attempts: number; error: Error }> {
  const started = Date.now();
  let attempts = 0;
  let lastError: Error = new Error("retry_exhausted");
  while (attempts < input.maxAttempts && Date.now() - started <= input.maxTotalMs) {
    attempts += 1;
    try {
      const value = await run(attempts);
      return { ok: true, attempts, value };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempts >= input.maxAttempts || Date.now() - started > input.maxTotalMs) break;
      await new Promise((resolve) => setTimeout(resolve, input.backoffMs * attempts));
    }
  }
  return { ok: false, attempts, error: lastError };
}

export function denyRemoteByDefault(input: { allowRemoteExecution?: boolean; trustAttested?: boolean }): {
  allowed: boolean;
  reason?: string;
} {
  if (!input.allowRemoteExecution) return { allowed: false, reason: "remote_execution_disabled_by_default" };
  if (!input.trustAttested) return { allowed: false, reason: "remote_execution_denied_untrusted" };
  return { allowed: true };
}

export function unavailableDegraded(input: {
  kind: "runtime" | "model" | "gpu" | "probe";
  source: string;
  message: string;
  at?: string;
}): DegradedUnavailableState {
  return {
    state: "degraded",
    reasonCode: `${input.kind}_unavailable`,
    message: input.message,
    source: input.source,
    at: input.at ?? new Date().toISOString(),
  };
}

export class CleanupRegistry {
  #ran = false;

  #cleanup = new Set<() => void | Promise<void>>();

  register(cleanup: () => void | Promise<void>): void {
    this.#cleanup.add(cleanup);
  }

  async runOnce(): Promise<void> {
    if (this.#ran) return;
    this.#ran = true;
    const items = [...this.#cleanup];
    this.#cleanup.clear();
    await Promise.all(items.map((item) => item()));
  }
}
