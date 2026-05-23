// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OperatorGraphReplayRecord } from "./operatorgraph";
import type { RecallForgeRecord } from "./recallforge";
import type { PolicyDecision } from "./threatmesh";

export interface OperatorConsoleInput {
  executionId: string;
  traceId?: string;
  topology: { nodes: string[]; unavailableReason?: string };
  timeline: { events: Array<{ at: string; status: string; summary: string }>; unavailableReason?: string };
  routing?: { selected?: string; rejected?: string[]; reasonCodes?: string[] };
  replay?: OperatorGraphReplayRecord | null;
  retrieval?: { ref?: string; state: "completed" | "unavailable"; lineage: string[] };
  policy?: { ref?: string; decision?: PolicyDecision; unavailableReason?: string };
  degraded: string[];
  health: { state: "healthy" | "degraded" | "unavailable"; details: string[] };
  outcome: { status: "completed" | "failed" | "denied"; summary: string };
  memoryProvenance: RecallForgeRecord[];
  queue?: { timeline: Array<{ at: string; type: string; queueId: string }>; idempotencyKey?: string; leaseRef?: string; unavailableReason?: string; };
}

export interface OperatorConsoleSurface {
  executionId: string;
  traceId?: string;
  labels: string[];
  topology: { state: "ready" | "empty" | "unavailable"; details: string };
  timeline: { state: "ready" | "empty" | "unavailable"; details: string };
  routeExplanation: { state: "ready" | "empty"; details: string };
  replay: { state: "ready" | "empty" | "unavailable"; reference?: string; details: string };
  retrievalLineage: { state: "ready" | "empty" | "unavailable"; reference?: string; details: string };
  policyEvaluation: { state: "ready" | "empty" | "unavailable"; reference?: string; details: string };
  degradedStates: { explicit: boolean; reasons: string[] };
  recovery: { state: "none" | "actionable"; action: string };
  runtimeHealth: { state: "healthy" | "degraded" | "unavailable"; details: string[] };
  executionOutcome: { status: "completed" | "failed" | "denied"; summary: string };
  memoryProvenance: { state: "ready" | "empty"; references: string[] };
  queueEvidence: { state: "ready" | "empty" | "unavailable"; details: string; idempotencyStatus: string };
}

function renderState(hasData: boolean, unavailableReason?: string): "ready" | "empty" | "unavailable" {
  if (unavailableReason) return "unavailable";
  return hasData ? "ready" : "empty";
}

export function buildOperatorConsoleSurface(input: OperatorConsoleInput): OperatorConsoleSurface {
  const replayState = renderState(Boolean(input.replay), input.replay?.unavailableReason);
  const retrievalState = renderState((input.retrieval?.lineage.length ?? 0) !== 0, input.retrieval?.state === "unavailable" ? "retrieval_unavailable" : undefined);
  const policyState = renderState(Boolean(input.policy?.decision), input.policy?.unavailableReason);
  const timelineState = renderState(input.timeline.events.length !== 0, input.timeline.unavailableReason);
  const topologyState = renderState(input.topology.nodes.length !== 0, input.topology.unavailableReason);
  const queueState = renderState((input.queue?.timeline.length ?? 0) !== 0, input.queue?.unavailableReason);

  return {
    executionId: input.executionId,
    traceId: input.traceId,
    labels: ["operator_console", "deterministic", "truth_surface"],
    topology: {
      state: topologyState,
      details:
        topologyState === "ready"
          ? `${input.topology.nodes.length} runtime node(s) observed`
          : topologyState === "empty"
            ? "No runtime topology observed for this execution"
            : `Topology unavailable: ${input.topology.unavailableReason}`,
    },
    timeline: {
      state: timelineState,
      details:
        timelineState === "ready"
          ? `${input.timeline.events.length} event(s) recorded`
          : timelineState === "empty"
            ? "No timeline events recorded"
            : `Timeline unavailable: ${input.timeline.unavailableReason}`,
    },
    routeExplanation: {
      state: input.routing?.reasonCodes?.length ? "ready" : "empty",
      details: input.routing?.reasonCodes?.length
        ? `Selected ${input.routing.selected ?? "none"} because ${input.routing.reasonCodes.join(", ")}`
        : "No routing explanation available",
    },
    replay: {
      state: replayState,
      reference: input.traceId,
      details: replayState === "ready" ? "Replay trace available" : replayState === "empty" ? "Replay not captured for this execution" : `Replay unavailable: ${input.replay?.unavailableReason}`,
    },
    retrievalLineage: {
      state: retrievalState,
      reference: input.retrieval?.ref,
      details:
        retrievalState === "ready"
          ? `${input.retrieval?.lineage.length ?? 0} retrieval lineage reference(s)`
          : retrievalState === "empty"
            ? "No retrieval lineage captured"
            : "Retrieval lineage unavailable",
    },
    policyEvaluation: {
      state: policyState,
      reference: input.policy?.ref,
      details:
        policyState === "ready"
          ? `Policy ${input.policy?.decision?.allowed ? "allowed" : "denied"} with ${input.policy?.decision?.reasons.length ?? 0} reason(s)`
          : policyState === "empty"
            ? "No policy evaluation attached"
            : `Policy unavailable: ${input.policy?.unavailableReason}`,
    },
    degradedStates: {
      explicit: input.degraded.length !== 0,
      reasons: input.degraded,
    },
    recovery: {
      state: input.degraded.length ? "actionable" : "none",
      action: input.degraded.length ? "Resolve degraded reason codes from receipt and retry execution." : "No recovery required.",
    },
    runtimeHealth: input.health,
    executionOutcome: input.outcome,
    memoryProvenance: {
      state: input.memoryProvenance.length === 0 ? "empty" : "ready",
      references: input.memoryProvenance.map((record) => record.id),
    },
    queueEvidence: {
      state: queueState,
      details: queueState === "ready" ? `${input.queue?.timeline.length} queue event(s) recorded` : queueState === "empty" ? "No queue timeline" : `Queue unavailable: ${input.queue?.unavailableReason}`,
      idempotencyStatus: input.queue?.idempotencyKey ? `Key: ${input.queue.idempotencyKey}` : "No idempotency key",
    },
  };
}
