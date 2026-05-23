// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NautilusEventEnvelope } from "./nautilus-event-fabric";
import type { RecallForgeRecord } from "./recallforge";

export interface Proofpack {
  id: string;
  generatedAt: string;
  executionId: string;
  correlationId: string;
  eventLineage: NautilusEventEnvelope[];
  policyLineage: NautilusEventEnvelope[];
  retrievalLineage: NautilusEventEnvelope[];
  traceLineage: NautilusEventEnvelope[];
  memoryRefs: string[];
  degradedStates: string[];
  evidenceRefs: string[];
  queueTimeline?: Record<string, unknown>[];
  routingDecision?: Record<string, unknown>;
  schedulerReasoning?: Record<string, unknown>;
  rejectedCandidates?: Record<string, unknown>[];
  retryEvidence?: { attemptCount: number; lastReason?: string; exhausted: boolean }[];
  deadLetterEvidence?: { queueId: string; reason: string; at: string }[];
  checkpointRef?: string;
  replayMetadata?: Record<string, unknown>;
  runtimeAvailabilityState?: Record<string, unknown>;
  verificationEvidence?: string[];
}

export function buildProofpack(input: {
  executionId: string;
  correlationId: string;
  events: NautilusEventEnvelope[];
  memoryRecords?: RecallForgeRecord[];
  degradedStates: string[];
  queueTimeline?: Record<string, unknown>[];
  routingDecision?: Record<string, unknown>;
  schedulerReasoning?: Record<string, unknown>;
  rejectedCandidates?: Record<string, unknown>[];
  retryEvidence?: { attemptCount: number; lastReason?: string; exhausted: boolean }[];
  deadLetterEvidence?: { queueId: string; reason: string; at: string }[];
  checkpointRef?: string;
  replayMetadata?: Record<string, unknown>;
  runtimeAvailabilityState?: Record<string, unknown>;
  verificationEvidence?: string[];
}): Proofpack {
  const generatedAt = new Date().toISOString();
  const eventLineage = input.events.filter((event) => event.executionId === input.executionId || event.correlationId === input.correlationId);
  const policyLineage = eventLineage.filter((event) => event.family === "policy");
  const retrievalLineage = eventLineage.filter((event) => event.family === "retrieval");
  const traceLineage = eventLineage.filter((event) => event.family === "trace" || event.type === "execution.started" || event.type === "execution.completed" || event.type === "execution.failed");

  const memoryRefs = (input.memoryRecords ?? [])
    .filter((record) => record.provenanceEvent.executionId === input.executionId)
    .map((record) => record.id);

  const evidenceRefs = [
    ...eventLineage.map((event) => `event:${event.type}:${event.timestamp}`),
    ...memoryRefs.map((id) => `memory:${id}`),
  ];

  const runtimeAvailabilityState = input.runtimeAvailabilityState ?? (() => {
    const state: Record<string, string> = {};
    if (input.degradedStates.some((s) => s.includes("retrieval_engine_unavailable"))) {
      state.retrieval = "unavailable";
    }
    if (input.degradedStates.some((s) => s.includes("memory_store_unavailable"))) {
      state.memory = "unavailable";
    }
    if (input.degradedStates.some((s) => s.includes("policy_engine_unavailable"))) {
      state.policy = "unavailable";
    }
    if (input.degradedStates.some((s) => s.includes("trace_store_unavailable"))) {
      state.trace = "unavailable";
    }
    if (input.degradedStates.some((s) => s.includes("token_budget_overflow"))) {
      state.tokenBudget = "overflow";
    }
    if (input.degradedStates.some((s) => s.includes("queue_saturated") || s.includes("queue_over_capacity"))) {
      state.queue = "saturated";
    }
    return Object.keys(state).length > 0 ? state : undefined;
  })();

  return {
    id: `${input.executionId}:proofpack:${generatedAt}`,
    generatedAt,
    executionId: input.executionId,
    correlationId: input.correlationId,
    eventLineage,
    policyLineage,
    retrievalLineage,
    traceLineage,
    memoryRefs,
    degradedStates: [...new Set(input.degradedStates)],
    evidenceRefs,
    queueTimeline: input.queueTimeline,
    routingDecision: input.routingDecision,
    schedulerReasoning: input.schedulerReasoning,
    rejectedCandidates: input.rejectedCandidates,
    retryEvidence: input.retryEvidence,
    deadLetterEvidence: input.deadLetterEvidence,
    checkpointRef: input.checkpointRef,
    replayMetadata: input.replayMetadata,
    runtimeAvailabilityState: runtimeAvailabilityState as Record<string, unknown> | undefined,
    verificationEvidence: input.verificationEvidence,
  };
}
