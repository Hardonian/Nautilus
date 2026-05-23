// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NodeDescriptor } from "./types";
import type { OperationalEvent } from "./operational-memory";

export function summarizePolicyOutcomes(events: OperationalEvent[]): Record<string, number> {
  const summary: Record<string, number> = { allow: 0, deny: 0, approval_required: 0, unavailable: 0 };
  for (const event of events.filter((e) => e.category === "policy_outcome")) {
    const decision = event.payload["policyDecision"] as { allowed?: boolean; requiredApproval?: boolean } | undefined;
    if (!decision) { summary.unavailable += 1; continue; }
    if (decision.allowed && decision.requiredApproval) summary.approval_required += 1;
    else if (decision.allowed) summary.allow += 1;
    else summary.deny += 1;
  }
  return summary;
}

export function summarizeDegradedTimeline(events: OperationalEvent[]): string[] {
  return events
    .filter((e) => e.category === "degraded_state")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((e) => `${e.occurredAt} observed ${(e.payload["degraded"] as { reasonCode?: string } | undefined)?.reasonCode ?? "unknown"}`);
}

export function summarizeFallbackFrequency(events: OperationalEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const event of events.filter((e) => e.category === "fallback")) {
    const reason = (event.payload["fallback"] as { reason?: string } | undefined)?.reason ?? "unknown";
    out[reason] = (out[reason] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function summarizeStaleNodes(nodes: NodeDescriptor[], now: string, staleAfterMs = 60_000): string[] {
  const nowMs = Date.parse(now);
  return nodes
    .filter((n) => nowMs - Date.parse(n.lastHeartbeatAt) > staleAfterMs || n.health === "stale")
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    .map((n) => `${n.nodeId}: observed ${n.health}`);
}

const TELEMETRY_KINDS = new Set([
  "telemetry_probe_started", "telemetry_probe_succeeded", "telemetry_probe_failed", "telemetry_parse_succeeded", "telemetry_parse_partial", "telemetry_parse_failed", "telemetry_unavailable", "telemetry_stale", "telemetry_conflict_detected", "telemetry_registry_update_applied", "telemetry_registry_update_skipped",
]);

export function summarizeTelemetryEventCounts(events: OperationalEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const event of events) if (TELEMETRY_KINDS.has(event.category)) out[event.category] = (out[event.category] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function summarizeTelemetryDimensions(events: OperationalEvent[]): { confidence: Record<string, number>; source: Record<string, number> } {
  const confidence: Record<string, number> = {};
  const source: Record<string, number> = {};
  for (const event of events.filter((e) => TELEMETRY_KINDS.has(e.category))) {
    source[event.source] = (source[event.source] ?? 0) + 1;
    const value = String((event.payload["confidence"] ?? "unknown"));
    confidence[value] = (confidence[value] ?? 0) + 1;
  }
  return { confidence, source };
}

export function summarizeExecutionPlanEventCounts(events: OperationalEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const event of events) {
    if (!event.category.startsWith("execution_")) continue;
    out[event.category] = (out[event.category] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

// ---------------------------------------------------------------------------
// Queue pressure metrics (derived from scheduler_outcome events)
// ---------------------------------------------------------------------------

export interface QueuePressureMetrics {
  sampleCount: number;
  depths: number[];
  p50Depth: number;
  p90Depth: number;
  maxDepth: number;
  saturationCount: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)]!;
}

export function summarizeQueuePressure(events: OperationalEvent[]): QueuePressureMetrics {
  const depths: number[] = [];
  let saturationCount = 0;

  for (const event of events) {
    if (event.category !== "scheduler_outcome") continue;
    const decision = event.payload["schedulingDecision"] as { rejected?: Array<{ capabilityInputs?: { queueDepth?: number; queuePressure?: number } }> } | undefined;
    if (!decision?.rejected) continue;
    for (const r of decision.rejected) {
      const d = r.capabilityInputs?.queueDepth;
      if (typeof d === "number") depths.push(d);
      const p = r.capabilityInputs?.queuePressure;
      if (typeof p === "number" && p >= 0.9) saturationCount += 1;
    }
  }

  const sorted = [...depths].sort((a, b) => a - b);
  return {
    sampleCount: sorted.length,
    depths: sorted,
    p50Depth: percentile(sorted, 0.5),
    p90Depth: percentile(sorted, 0.9),
    maxDepth: sorted.length > 0 ? sorted[sorted.length - 1]! : 0,
    saturationCount,
  };
}

// ---------------------------------------------------------------------------
// Execution timing aggregation (derived from receipt events)
// ---------------------------------------------------------------------------

export interface ExecutionTimingMetrics {
  sampleCount: number;
  totalMsValues: number[];
  queueMsValues: number[];
  executionMsValues: number[];
  meanTotalMs: number;
  p90TotalMs: number;
  minTotalMs: number;
  maxTotalMs: number;
}

export function summarizeExecutionTiming(events: OperationalEvent[]): ExecutionTimingMetrics {
  const totalMsValues: number[] = [];
  const queueMsValues: number[] = [];
  const executionMsValues: number[] = [];

  for (const event of events.filter((e) => e.category === "receipt")) {
    const receipt = event.payload["receipt"] as { timing?: { totalMs?: number; queueMs?: number; executionMs?: number } } | undefined;
    if (!receipt?.timing) continue;
    if (typeof receipt.timing.totalMs === "number") totalMsValues.push(receipt.timing.totalMs);
    if (typeof receipt.timing.queueMs === "number") queueMsValues.push(receipt.timing.queueMs);
    if (typeof receipt.timing.executionMs === "number") executionMsValues.push(receipt.timing.executionMs);
  }

  const sorted = [...totalMsValues].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    sampleCount: sorted.length,
    totalMsValues: sorted,
    queueMsValues: [...queueMsValues].sort((a, b) => a - b),
    executionMsValues: [...executionMsValues].sort((a, b) => a - b),
    meanTotalMs: sorted.length > 0 ? Math.round(sum / sorted.length) : 0,
    p90TotalMs: percentile(sorted, 0.9),
    minTotalMs: sorted.length > 0 ? sorted[0]! : 0,
    maxTotalMs: sorted.length > 0 ? sorted[sorted.length - 1]! : 0,
  };
}

// ---------------------------------------------------------------------------
// Scheduler decision summary (deterministic aggregation of routing outcomes)
// ---------------------------------------------------------------------------

export interface SchedulerDecisionSummary {
  totalDecisions: number;
  selectedCount: number;
  rejectedAllCount: number;
  topRejectionReasons: Record<string, number>;
}

export function summarizeSchedulerDecisions(events: OperationalEvent[]): SchedulerDecisionSummary {
  let totalDecisions = 0;
  let selectedCount = 0;
  let rejectedAllCount = 0;
  const rejectionReasons: Record<string, number> = {};

  for (const event of events.filter((e) => e.category === "scheduler_outcome")) {
    totalDecisions += 1;
    const decision = event.payload["schedulingDecision"] as { selected?: { nodeId: string }; rejected?: Array<{ rejectionReasons?: string[] }> } | undefined;
    if (decision?.selected) {
      selectedCount += 1;
    } else {
      rejectedAllCount += 1;
    }
    if (decision?.rejected) {
      for (const r of decision.rejected) {
        for (const reason of r.rejectionReasons ?? []) {
          // Normalize structured reasons to their base code for aggregation
          const base = reason.split(":")[0]!;
          rejectionReasons[base] = (rejectionReasons[base] ?? 0) + 1;
        }
      }
    }
  }

  return {
    totalDecisions,
    selectedCount,
    rejectedAllCount,
    topRejectionReasons: Object.fromEntries(
      Object.entries(rejectionReasons).sort(([, a], [, b]) => b - a),
    ),
  };
}

// ---------------------------------------------------------------------------
// Degraded state aggregation across runs
// ---------------------------------------------------------------------------

export interface DegradedStateAggregation {
  totalEvents: number;
  byReasonCode: Record<string, number>;
  bySeverity: Record<string, number>;
  affectedSubsystems: string[];
}

export function summarizeDegradedStateAggregation(events: OperationalEvent[]): DegradedStateAggregation {
  const byReasonCode: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const subsystems = new Set<string>();
  let totalEvents = 0;

  for (const event of events.filter((e) => e.category === "degraded_state")) {
    totalEvents += 1;
    const degraded = event.payload["degraded"] as { reasonCode?: string; severity?: string; affectedSubsystem?: string } | undefined;
    if (degraded?.reasonCode) {
      byReasonCode[degraded.reasonCode] = (byReasonCode[degraded.reasonCode] ?? 0) + 1;
    }
    if (degraded?.severity) {
      bySeverity[degraded.severity] = (bySeverity[degraded.severity] ?? 0) + 1;
    }
    if (degraded?.affectedSubsystem) {
      subsystems.add(degraded.affectedSubsystem);
    }
  }

  return {
    totalEvents,
    byReasonCode: Object.fromEntries(Object.entries(byReasonCode).sort(([a], [b]) => a.localeCompare(b))),
    bySeverity: Object.fromEntries(Object.entries(bySeverity).sort(([a], [b]) => a.localeCompare(b))),
    affectedSubsystems: [...subsystems].sort(),
  };
}
