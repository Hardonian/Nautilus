// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { defaultRuntimeCapabilityRegistry, createExecutionPlan, type ResourceSnapshot } from "./runtime-intelligence";
import { FailClosedApprovalGate, evaluateExecutionGovernance } from "./threatmesh";
import { InMemoryOperatorGraph } from "./operatorgraph";
import { InMemoryRecallForge } from "./recallforge";
import { rankRetrievalSources } from "./meshrag";

function snapshot(): ResourceSnapshot {
  return {
    capturedAt: "2026-05-18T00:00:00.000Z",
    source: "declared",
    nodes: [
      {
        id: "node-a",
        label: "A",
        runtimeType: "ollama",
        gpu: [{ id: "g1", model: "A10", availableVramMiB: { state: "known", value: 24000 }, thermalState: { state: "known", value: "nominal" }, quantizationSupport: { state: "known", value: ["q4_0"] } }],
        capabilityProfile: { runtimeType: "ollama", supportedRuntimes: ["ollama"], inferenceEngine: "ollama", supportsEmbedding: true, supportsReasoning: true, supportsMultimodal: false, supportsStreaming: true, supportsToolCall: true, maxContextTokens: { state: "unknown" }, quantizationSupport: ["q4_0"] },
        health: { availabilityState: "available", degradedState: false, offlineState: false, queueState: "idle" },
      },
      {
        id: "node-b",
        label: "B",
        runtimeType: "vllm",
        gpu: [{ id: "g2", model: "L40", availableVramMiB: { state: "known", value: 48000 }, thermalState: { state: "unsupported", reason: "sensor unavailable" }, quantizationSupport: { state: "unknown" } }],
        capabilityProfile: { runtimeType: "vllm", supportedRuntimes: ["vllm"], inferenceEngine: "vllm", supportsEmbedding: true, supportsReasoning: true, supportsMultimodal: true, supportsStreaming: true, supportsToolCall: true, maxContextTokens: { state: "unknown" }, quantizationSupport: [] },
        health: { availabilityState: "degraded", degradedState: true, offlineState: false, queueState: "queued" },
      },
    ],
  };
}

describe("runtime intelligence m2", () => {
  it("keeps runtime detection explicit when unsupported", () => {
    const detected = defaultRuntimeCapabilityRegistry().describeAll();
    expect(detected.every((d) => d.detected.state !== "known")).toBe(true);
  });

  it("builds deterministic placement and fallback", () => {
    const decision = new FailClosedApprovalGate().evaluate("execute", [], 80);
    const plan = createExecutionPlan({ snapshot: snapshot(), workload: "reasoning", constraints: { minVramMiB: 20000, allowDegraded: true }, policyDecision: decision });
    expect(plan.selectedNode).toBe("node-a");
    expect(plan.fallbackPath[0]?.nodeId).toBe("node-b");
  });

  it("rejects with explainable reasons", () => {
    const decision = new FailClosedApprovalGate().evaluate("execute", [], 80);
    expect(() => createExecutionPlan({ snapshot: snapshot(), workload: "multimodal", constraints: { requiredRuntimeTypes: ["llama.cpp"] }, policyDecision: decision })).toThrow(/Rejections/);
  });

  it("fails closed governance", () => {
    const decision = evaluateExecutionGovernance({ action: "execute", workloadClass: "reasoning", runtimeTrustScore: 90, runtimeIsolation: "isolated", auditRef: "audit:1" }, new FailClosedApprovalGate(), []);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("runtime_isolated");
  });

  it("tracks execution graph edges and replay snapshots", () => {
    const graph = new InMemoryOperatorGraph();
    graph.append({ traceId: "t1", spanId: "s1", executionStatus: "started", startedAt: "2026-05-18T00:00:00.000Z" });
    graph.append({ traceId: "t1", spanId: "s2", parentSpanId: "s1", executionStatus: "completed", startedAt: "2026-05-18T00:00:01.000Z" });
    graph.addEdge("t1", { fromSpanId: "s1", toSpanId: "s2", type: "dependency", reason: "must_run" });
    graph.addSnapshot("t1", { snapshotId: "r1", capturedAt: "2026-05-18T00:00:02.000Z", state: "completed" });
    expect(graph.get("t1")?.edges.length).toBe(1);
    expect(graph.get("t1")?.snapshots.length).toBe(1);
  });

  it("records operational learning provenance", () => {
    const forge = new InMemoryRecallForge();
    forge.write({ id: "1", category: "routing_outcome", createdAt: "2026-05-18", provenanceEvent: { type: "route", timestamp: "2026-05-18", source: "runtime", executionId: "e1", correlationId: "c1" }, data: { outcome: "success", fallbackUsed: true, degraded: true, remediationRef: "kb:1" } });
    const summary = forge.summarizeOperationalLearning("e1");
    expect(summary.fallbackUsedCount).toBe(1);
    expect(summary.remediationLinks).toContain("kb:1");
  });

  it("preserves retrieval lineage ranking", () => {
    const ranked = rankRetrievalSources([{ sourceId: "b", score: 0.3, rationale: "" }, { sourceId: "a", score: 0.8, rationale: "" }]);
    expect(ranked[0]?.sourceId).toBe("a");
  });
});
