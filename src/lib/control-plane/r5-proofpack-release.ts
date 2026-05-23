// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface R5ProofpackInput {
  queueTimeline: Array<{ type: string; queueId: string; reason?: string }>;
  routingDecision: { selected: string; reason: string };
  degradedReasons: string[];
  checkpoint: { runId: string; taskId: string; replayCursor: string };
  verification: { scripts: string[]; executedAt: string };
}

export function buildR5Proofpack(input: R5ProofpackInput): Record<string, unknown> {
  return {
    kind: "nautilus.proofpack.r5",
    queue: { timeline: input.queueTimeline },
    routing: input.routingDecision,
    degraded: input.degradedReasons,
    replay: input.checkpoint,
    verification: input.verification,
  };
}

export interface ReleaseGap { id: string; severity: "low" | "medium" | "high"; resolved: boolean }
export interface Waiver { gapId: string; approvedBy: string }

export function evaluateReleaseGate(gaps: ReleaseGap[], waivers: Waiver[]): { pass: boolean; blocked: string[] } {
  const waived = new Set(waivers.map((item) => item.gapId));
  const blocked = gaps.filter((gap) => gap.severity === "high" && !gap.resolved && !waived.has(gap.id)).map((gap) => gap.id);
  return { pass: blocked.length === 0, blocked };
}

export function validateVerificationMatrixScripts(input: { referencedScripts: string[]; packageScripts: Record<string, string> }): { ok: true } | { ok: false; missing: string[] } {
  const missing = input.referencedScripts.filter((script) => !input.packageScripts[script]);
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}

export async function runBenchmarkHarness(input: {
  runtimeAvailable: boolean;
  reasonIfUnavailable?: string;
  callable?: () => Promise<unknown> | unknown;
}): Promise<{ status: "unavailable"; reason: string } | { status: "ok"; latencyMs: number }> {
  if (!input.runtimeAvailable || !input.callable) {
    return { status: "unavailable", reason: input.reasonIfUnavailable ?? "runtime_adapter_unavailable" };
  }
  const started = process.hrtime.bigint();
  await input.callable();
  const ended = process.hrtime.bigint();
  const latencyMs = Number(ended - started) / 1_000_000;
  return { status: "ok", latencyMs };
}
