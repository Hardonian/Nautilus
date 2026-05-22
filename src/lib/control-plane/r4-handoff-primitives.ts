// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";

export interface HandoffPacket {
  schemaVersion: "1.0.0";
  runId: string;
  taskId: string;
  step: string;
  objective: string;
  evidenceRefs: Array<{ id: string; link: string }>;
  context: string[];
  createdAt: string;
}

export function validateHandoffPacket(packet: Partial<HandoffPacket>): { ok: true } | { ok: false; reason: string } {
  if (!packet.runId || !packet.taskId || !packet.step || !packet.objective || !packet.createdAt) return { ok: false, reason: "missing_required_fields" };
  if (packet.schemaVersion !== "1.0.0") return { ok: false, reason: "invalid_schema_version" };
  if (!Array.isArray(packet.evidenceRefs)) return { ok: false, reason: "invalid_evidence_refs" };
  return { ok: true };
}

export function compactContextPreservingEvidence(packet: HandoffPacket, maxItems: number): HandoffPacket {
  return {
    ...packet,
    context: packet.context.slice(-Math.max(1, maxItems)),
    evidenceRefs: [...packet.evidenceRefs],
  };
}

export function taskFingerprint(input: { objective: string; constraints: string[]; inputs: string[] }): string {
  const canonical = JSON.stringify({
    objective: input.objective.trim(),
    constraints: [...input.constraints].map((v) => v.trim()).sort(),
    inputs: [...input.inputs].map((v) => v.trim()).sort(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function reuseGuard<T>(
  cache: Map<string, { safeToReuse: boolean; result: T }>,
  fingerprint: string,
): { reused: true; result: T } | { reused: false } {
  const item = cache.get(fingerprint);
  if (!item || !item.safeToReuse) return { reused: false };
  return { reused: true, result: item.result };
}

export function estimateTokenBudget(input: { strings: string[]; budget: number }): {
  estimatedTokens: number;
  overBudget: boolean;
  degraded?: { state: "degraded"; reason: "token_budget_overflow"; estimatedTokens: number; budget: number };
} {
  const estimatedTokens = Math.ceil(input.strings.join(" ").length / 4);
  if (estimatedTokens > input.budget) {
    return {
      estimatedTokens,
      overBudget: true,
      degraded: { state: "degraded", reason: "token_budget_overflow", estimatedTokens, budget: input.budget },
    };
  }
  return { estimatedTokens, overBudget: false };
}

export interface CheckpointState {
  runId: string;
  taskId: string;
  status: "queued" | "running" | "completed" | "degraded";
  checkpointAt: string;
  replayCursor: string;
}

export function saveCheckpoint(state: CheckpointState): string {
  return JSON.stringify(state);
}

export function loadCheckpoint(serialized: string): CheckpointState {
  return JSON.parse(serialized) as CheckpointState;
}

export function replayCheckpoint(checkpoint: CheckpointState): { runId: string; taskId: string; status: CheckpointState["status"]; replayCursor: string } {
  return { runId: checkpoint.runId, taskId: checkpoint.taskId, status: checkpoint.status, replayCursor: checkpoint.replayCursor };
}
