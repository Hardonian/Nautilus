// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { capabilityFromEnv, compactHandoff, recursiveCollaborate, routeModel, validateHandoff, type AgentHandoffState } from "./orchestration";

function makeState(): AgentHandoffState {
  return {
    schemaVersion: "1.0.0", taskId: "t1", currentRunId: "r1", phase: "plan", objective: "obj", constraints: ["c1"], acceptedFacts: ["a"], rejectedFacts: [], openQuestions: [], decisionsMade: [],
    toolEvidenceRefs: ["te1"], fileEvidenceRefs: ["fe1"], commandEvidenceRefs: ["ce1"], compactWorkingState: { x: 1 }, confidence: 0.5, riskFlags: [], tokenBudget: { maxInputTokens: 1000, maxOutputTokens: 1000, reservedForSystem: 100, reservedForEvidence: 200, reservedForFinal: 200, estimatedInput: 100, estimatedOutput: 50, budgetStatus: "ok" }, latencyClass: "interactive", modelClassNeeded: "small", gpuPreference: "neutral", privacyClass: "local_only", maxRounds: 2, currentRound: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("orchestration contracts", () => {
  it("validates handoff", () => { expect(validateHandoff(makeState())).toEqual({ ok: true }); });
  it("rejects invalid phase", () => {
    const bad = { ...makeState(), phase: "bad" as any };
    expect(validateHandoff(bad)).toEqual({ ok: false, reason: "invalid_phase" });
  });
  it("compresses oversized state deterministically", () => {
    const big = { ...makeState(), acceptedFacts: new Array(200).fill("x"), compactWorkingState: { text: "y".repeat(10000) } };
    const out = compactHandoff(big, 1500);
    expect(out.originalBytes).toBeGreaterThan(out.compressedBytes);
    expect(out.compressedState.toolEvidenceRefs).toEqual(["te1"]);
  });
  it("fails closed for local-only with external backend", () => {
    const state = makeState();
    const cap = capabilityFromEnv({ NAUTILUS_DEFAULT_BACKEND: "openai" } as any);
    const route = routeModel({ handoff: state, capabilities: cap, estimatedInputTokens: 20, retrievalSufficient: true });
    expect(route.degradationReason).toBe("external_blocked_by_policy");
  });
  it("blocks long-context when retrieval is sufficient", () => {
    const state = { ...makeState(), modelClassNeeded: "long_context" as const, privacyClass: "external_allowed" as const };
    const cap = capabilityFromEnv({ NAUTILUS_DEFAULT_BACKEND: "vllm" } as any);
    const route = routeModel({ handoff: state, capabilities: cap, estimatedInputTokens: 20, retrievalSufficient: true });
    expect(route.selectedModel).toBe("small");
    expect(route.rejectedReasons).toContain("long_context_rejected_retrieval_sufficient");
  });
});


describe("recursive collaboration", () => {
  it("enforces max rounds", () => {
    const result = recursiveCollaborate({ initial: makeState(), mode: "recursive_compact", maxRounds: 1, confidenceThreshold: 1 });
    expect(result.roundsExecuted).toBe(1);
    expect(result.terminationReason).toBe("max_rounds_reached");
  });

  it("supports verifier repair with one bounded pass", () => {
    const result = recursiveCollaborate({ initial: makeState(), mode: "verifier_repair", maxRounds: 2, verifierRequestsRepair: true, confidenceThreshold: 1 });
    expect(result.finalState.decisionsMade).toContain("verifier_requested_repair");
    expect(["verifier_failed_no_repair_budget", "verifier_passed", "max_rounds_reached"]).toContain(result.terminationReason);
  });

  it("fails with explicit token budget exhausted", () => {
    const state = makeState();
    state.tokenBudget.estimatedInput = 5000;
    const result = recursiveCollaborate({ initial: state, mode: "recursive_compact", maxTokensIn: 100 });
    expect(result.terminationReason).toBe("token_budget_exhausted");
    expect(result.finalState.degradationReason).toBe("token_budget_exhausted");
  });

  it("supports degraded single model mode", () => {
    const result = recursiveCollaborate({ initial: makeState(), mode: "degraded_single_model" });
    expect(result.terminationReason).toBe("degraded_policy_triggered");
    expect(result.finalState.degradationReason).toBe("degraded_single_model");
  });
});
