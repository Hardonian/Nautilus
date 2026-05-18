// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { summarizeRecallForgeIntelligence } from "./recallforge-intelligence";
import type { OperationalEvent } from "./operational-memory";

describe("RecallForge intelligence summaries", () => {
  it("builds provenance-backed summaries and advisory recommendations", () => {
    const events: OperationalEvent[] = [
      { eventId: "e1", occurredAt: "2026-05-18T00:00:00.000Z", sequence: 1, category: "scheduler_outcome", source: "test", provenance: {}, payload: { schedulingDecision: { mode: "remote" } } },
      { eventId: "e2", occurredAt: "2026-05-18T00:00:01.000Z", sequence: 2, category: "degraded_state", source: "test", provenance: {}, payload: { degraded: { code: "retrieval_unavailable" } } },
      { eventId: "e3", occurredAt: "2026-05-18T00:00:01.000Z", sequence: 3, category: "fallback", source: "test", provenance: {}, payload: { fallback: { status: "succeeded" } } },
      { eventId: "e4", occurredAt: "2026-05-18T00:00:02.000Z", sequence: 4, category: "execution_authorization_denied", source: "test", provenance: {}, payload: { reasonCode: "policy_denied" } },
      { eventId: "e5", occurredAt: "2026-05-18T00:00:03.000Z", sequence: 5, category: "operator_override", source: "test", provenance: { actor: "alice" }, payload: {} },
      { eventId: "e6", occurredAt: "2026-05-18T00:00:04.000Z", sequence: 6, category: "replay_metadata", source: "test", provenance: {}, payload: { retrieval: { unavailable: true, topWeightedScore: 0.2 } } },
      { eventId: "e7", occurredAt: "2026-05-18T00:00:05.000Z", sequence: 7, category: "replay_metadata", source: "test", provenance: {}, payload: { retrieval: { unavailable: false, topWeightedScore: 0.8 } } },
    ];
    const summary = summarizeRecallForgeIntelligence(events);
    expect(summary.routingOutcomes.remote).toBe(1);
    expect(summary.failureFingerprints[0].evidenceEventIds).toContain("e2");
    expect(summary.fallbackEffectiveness.successRate).toBe(1);
    expect(summary.retrievalQuality.unavailable).toBe(1);
    expect(summary.policyDenials.reasonCodes.policy_denied).toBe(1);
    expect(summary.operatorOverrides.actors.alice).toBe(1);
    expect(summary.recommendations.every((r) => r.advisoryOnly)).toBe(true);
    expect(summary.recommendations.some((r) => r.confidence === "low")).toBe(true);
  });
});
