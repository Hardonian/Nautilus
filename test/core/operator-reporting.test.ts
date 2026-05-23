import { describe, it, expect } from "vitest";
import { buildOperatorExecutionSummary } from "../../src/lib/core/operator-reporting";
import type { ExecutionPlan } from "../../src/lib/core/runtime-intelligence";
import type { RetrievalResult } from "../../src/lib/core/meshrag";
import type { PolicyDecision } from "../../src/lib/core/threatmesh";

describe("buildOperatorExecutionSummary", () => {
  it("should return a success summary for happy path", () => {
    const mockPlan: ExecutionPlan = {
      selectedRuntime: "ollama",
      selectedNode: "node-1",
      rationale: [],
      rejectedNodes: [],
      constraints: { requiredRuntimeTypes: ["ollama"] },
      fallbackPath: [],
      degradedPath: [],
      policyReferences: []
    };

    const mockRetrieval: RetrievalResult = {
      requestId: "req-1",
      evidence: [{ sourceId: "doc-1" }],
      trust: []
    };

    const mockPolicy: PolicyDecision = {
      action: "exec",
      allowed: true,
      reasons: ["policy_pass"],
      trustScore: { value: 100, source: "test" },
      riskSignals: []
    };

    const summary = buildOperatorExecutionSummary({
      executionId: "exec-1",
      plan: mockPlan,
      retrieval: mockRetrieval,
      policy: mockPolicy,
      memoryRecordIds: ["mem-1"],
      traceRefs: ["trace-1"],
      errors: []
    });

    expect(summary).toMatchObject({
      executionId: "exec-1",
      runtimePlacement: { nodeId: "node-1", runtime: "ollama" },
      retrievalSources: ["doc-1"],
      policyEvaluations: ["policy_pass"],
      fallbackUsage: [],
      degradedStates: [],
      memoryRecordsCreated: ["mem-1"],
      traceReferences: ["trace-1"],
      errors: [],
      warnings: [],
      finalOutcome: "success"
    });
  });

  it("should return a degraded summary if retrieval has a degraded state", () => {
    const mockPlan: ExecutionPlan = {
      selectedRuntime: "ollama",
      selectedNode: "node-1",
      rationale: [],
      rejectedNodes: [],
      constraints: { requiredRuntimeTypes: ["ollama"] },
      fallbackPath: [],
      degradedPath: [],
      policyReferences: []
    };

    const mockRetrieval: RetrievalResult = {
      requestId: "req-1",
      evidence: [],
      trust: [],
      degradedState: "cache_miss_timeout"
    };

    const mockPolicy: PolicyDecision = {
      action: "exec",
      allowed: true,
      reasons: [],
      trustScore: { value: 100, source: "test" },
      riskSignals: []
    };

    const summary = buildOperatorExecutionSummary({
      executionId: "exec-1",
      plan: mockPlan,
      retrieval: mockRetrieval,
      policy: mockPolicy,
      memoryRecordIds: [],
      traceRefs: []
    });

    expect(summary.warnings).toContain("retrieval_degraded:cache_miss_timeout");
    expect(summary.degradedStates).toContain("retrieval_degraded:cache_miss_timeout");
    expect(summary.finalOutcome).toBe("degraded");
  });

  it("should return a degraded summary if plan has a degraded path", () => {
    const mockPlan: ExecutionPlan = {
      selectedRuntime: "ollama",
      selectedNode: "node-1",
      rationale: [],
      rejectedNodes: [],
      constraints: { requiredRuntimeTypes: ["ollama"] },
      fallbackPath: [],
      degradedPath: [{ nodeId: "node-2", runtimeType: "vllm", reason: "slow", degraded: true }],
      policyReferences: []
    };

    const mockRetrieval: RetrievalResult = {
      requestId: "req-1",
      evidence: [],
      trust: []
    };

    const mockPolicy: PolicyDecision = {
      action: "exec",
      allowed: true,
      reasons: [],
      trustScore: { value: 100, source: "test" },
      riskSignals: []
    };

    const summary = buildOperatorExecutionSummary({
      executionId: "exec-1",
      plan: mockPlan,
      retrieval: mockRetrieval,
      policy: mockPolicy,
      memoryRecordIds: [],
      traceRefs: []
    });

    expect(summary.degradedStates).toContain("node-2:slow");
    expect(summary.finalOutcome).toBe("degraded");
  });

  it("should return a failed summary if there are errors", () => {
     const mockPlan: ExecutionPlan = {
      selectedRuntime: "ollama",
      selectedNode: "node-1",
      rationale: [],
      rejectedNodes: [],
      constraints: { requiredRuntimeTypes: ["ollama"] },
      fallbackPath: [],
      degradedPath: [],
      policyReferences: []
    };

    const mockRetrieval: RetrievalResult = {
      requestId: "req-1",
      evidence: [],
      trust: []
    };

    const mockPolicy: PolicyDecision = {
      action: "exec",
      allowed: true,
      reasons: [],
      trustScore: { value: 100, source: "test" },
      riskSignals: []
    };

    const summary = buildOperatorExecutionSummary({
      executionId: "exec-1",
      plan: mockPlan,
      retrieval: mockRetrieval,
      policy: mockPolicy,
      memoryRecordIds: [],
      traceRefs: [],
      errors: ["test error"]
    });

    expect(summary.errors).toContain("test error");
    expect(summary.finalOutcome).toBe("failed");
  });

  it("should track fallback usage correctly", () => {
    const mockPlan: ExecutionPlan = {
      selectedRuntime: "ollama",
      selectedNode: "node-1",
      rationale: [],
      rejectedNodes: [],
      constraints: { requiredRuntimeTypes: ["ollama"] },
      fallbackPath: [{ nodeId: "node-3", runtimeType: "llama.cpp", reason: "primary_offline", degraded: false }],
      degradedPath: [],
      policyReferences: []
    };

    const mockRetrieval: RetrievalResult = {
      requestId: "req-1",
      evidence: [],
      trust: []
    };

    const mockPolicy: PolicyDecision = {
      action: "exec",
      allowed: true,
      reasons: [],
      trustScore: { value: 100, source: "test" },
      riskSignals: []
    };

    const summary = buildOperatorExecutionSummary({
      executionId: "exec-1",
      plan: mockPlan,
      retrieval: mockRetrieval,
      policy: mockPolicy,
      memoryRecordIds: [],
      traceRefs: [],
      errors: []
    });

    expect(summary.fallbackUsage).toContain("node-3:primary_offline");
  });
});
