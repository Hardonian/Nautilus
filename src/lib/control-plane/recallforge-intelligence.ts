// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OperationalEvent } from "./operational-memory";

export interface RecallForgeRecommendation {
  recommendationId: string;
  title: string;
  confidence: "high" | "medium" | "low";
  advisoryOnly: true;
  evidenceEventIds: string[];
}

export interface RecallForgeIntelligenceSummary {
  routingOutcomes: Record<string, number>;
  failureFingerprints: Array<{ fingerprint: string; count: number; evidenceEventIds: string[] }>;
  fallbackEffectiveness: { attempts: number; successful: number; successRate: number };
  retrievalQuality: { requests: number; unavailable: number; avgTopWeightedScore: number };
  policyDenials: { count: number; reasonCodes: Record<string, number> };
  operatorOverrides: { count: number; actors: Record<string, number> };
  recommendations: RecallForgeRecommendation[];
}

export function summarizeRecallForgeIntelligence(events: OperationalEvent[]): RecallForgeIntelligenceSummary {
  const routingOutcomes: Record<string, number> = {};
  const failures = new Map<string, { count: number; evidenceEventIds: string[] }>();
  let fallbackAttempts = 0;
  let fallbackSuccess = 0;
  let retrievalRequests = 0;
  let retrievalUnavailable = 0;
  let weightedTotal = 0;
  let weightedCount = 0;
  const denials: Record<string, number> = {};
  const actors: Record<string, number> = {};

  for (const event of events) {
    if (event.category === "scheduler_outcome") {
      const route = String(event.payload.schedulingDecision && (event.payload.schedulingDecision as { mode?: string }).mode ? (event.payload.schedulingDecision as { mode: string }).mode : "unknown");
      routingOutcomes[route] = (routingOutcomes[route] ?? 0) + 1;
    }
    if (event.category === "degraded_state") {
      const code = String((event.payload.degraded as { code?: string } | undefined)?.code ?? "unknown");
      const current = failures.get(code) ?? { count: 0, evidenceEventIds: [] };
      current.count += 1;
      current.evidenceEventIds.push(event.eventId);
      failures.set(code, current);
    }
    if (event.category === "fallback") {
      fallbackAttempts += 1;
      const ok = Boolean((event.payload.fallback as { status?: string } | undefined)?.status === "succeeded");
      if (ok) fallbackSuccess += 1;
    }
    if (event.category === "execution_authorization_denied") {
      const reason = String((event.payload.reasonCode as string | undefined) ?? "unknown");
      denials[reason] = (denials[reason] ?? 0) + 1;
    }
    if (event.category === "operator_override") {
      const actor = String(event.provenance.actor ?? "unknown");
      actors[actor] = (actors[actor] ?? 0) + 1;
    }
    if (event.category === "replay_metadata") {
      const metadata = event.payload as { retrieval?: { unavailable?: boolean; topWeightedScore?: number } };
      if (metadata.retrieval) {
        retrievalRequests += 1;
        if (metadata.retrieval.unavailable) retrievalUnavailable += 1;
        if (typeof metadata.retrieval.topWeightedScore === "number") {
          weightedTotal += metadata.retrieval.topWeightedScore;
          weightedCount += 1;
        }
      }
    }
  }

  const failureFingerprints = [...failures.entries()]
    .map(([fingerprint, value]) => ({ fingerprint, count: value.count, evidenceEventIds: value.evidenceEventIds }))
    .sort((a, b) => b.count - a.count);

  const recommendations: RecallForgeRecommendation[] = [];
  if (retrievalUnavailable > 0) {
    recommendations.push({
      recommendationId: "rf-rec-retrieval-degraded",
      title: "Investigate retrieval degraded/unavailable states before relying on memory-driven routing.",
      confidence: retrievalUnavailable > retrievalRequests / 2 ? "high" : "low",
      advisoryOnly: true,
      evidenceEventIds: failureFingerprints.find((f) => f.fingerprint.includes("retrieval"))?.evidenceEventIds ?? [],
    });
  }
  if ((denials.policy_denied ?? 0) > 0) {
    recommendations.push({
      recommendationId: "rf-rec-policy-denials",
      title: "Review policy denial clusters and adjust operator guidance; recommendations are advisory only.",
      confidence: "medium",
      advisoryOnly: true,
      evidenceEventIds: events.filter((e) => e.category === "execution_authorization_denied").map((e) => e.eventId),
    });
  }

  return {
    routingOutcomes,
    failureFingerprints,
    fallbackEffectiveness: { attempts: fallbackAttempts, successful: fallbackSuccess, successRate: fallbackAttempts === 0 ? 0 : fallbackSuccess / fallbackAttempts },
    retrievalQuality: { requests: retrievalRequests, unavailable: retrievalUnavailable, avgTopWeightedScore: weightedCount === 0 ? 0 : weightedTotal / weightedCount },
    policyDenials: { count: Object.values(denials).reduce((a, b) => a + b, 0), reasonCodes: denials },
    operatorOverrides: { count: Object.values(actors).reduce((a, b) => a + b, 0), actors },
    recommendations,
  };
}
