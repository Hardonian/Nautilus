// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { buildOperatorConsoleSurface } from "./operator-console";
import { InMemoryNautilusEventBus } from "./nautilus-event-fabric";
import { InMemoryOperatorGraph } from "./operatorgraph";
import { evaluatePolicyPacks, emitPolicyDecisionArtifacts, POLICY_PACKS } from "./policy-packs";
import { InMemoryRecallForge } from "./recallforge";

describe("operator governance milestone", () => {
  it("renders truthful empty and unavailable operator surfaces", () => {
    const surface = buildOperatorConsoleSurface({
      executionId: "exec-1",
      topology: { nodes: [] },
      timeline: { events: [], unavailableReason: "timeline_store_unavailable" },
      replay: null,
      retrieval: { state: "unavailable", lineage: [] },
      policy: { unavailableReason: "policy_log_unavailable" },
      degraded: ["timeline_store_unavailable", "retrieval_engine_unavailable"],
      health: { state: "degraded", details: ["telemetry delayed"] },
      outcome: { status: "denied", summary: "Policy denied operation" },
      memoryProvenance: [],
    });
    expect(surface.topology.state).toBe("empty");
    expect(surface.timeline.state).toBe("unavailable");
    expect(surface.retrievalLineage.state).toBe("unavailable");
    expect(surface.policyEvaluation.state).toBe("unavailable");
    expect(surface.degradedStates.explicit).toBe(true);
  });

  it("fails closed for high risk operations and missing policy packs", () => {
    const base = {
      executionId: "exec-2",
      correlationId: "corr-2",
      action: "tool.exec",
      riskSignals: [{ id: "r1", severity: "critical" as const, reason: "credential_exfiltration" }],
      trustScore: { value: 60, source: "runtime" },
      approval: { required: false },
    };
    const missingConfig = evaluatePolicyPacks({ ...base, packs: [] });
    expect(missingConfig.allowed).toBe(false);
    expect(missingConfig.reasons).toContain("missing_policy_config_high_risk_fail_closed");

    const packed = evaluatePolicyPacks({ ...base, packs: [POLICY_PACKS.high_risk_fail_closed] });
    expect(packed.allowed).toBe(false);
    expect(packed.reasons).toContain("high_risk_fail_closed");
  });

  it("requires explicit approval and emits lineage artifacts", () => {
    const eventBus = new InMemoryNautilusEventBus();
    const graph = new InMemoryOperatorGraph();
    const forge = new InMemoryRecallForge();
    const input = {
      executionId: "exec-3",
      correlationId: "corr-3",
      action: "runtime.execute",
      riskSignals: [{ id: "r2", severity: "medium" as const, reason: "manual_gate" }],
      trustScore: { value: 85, source: "runtime" },
      packs: [POLICY_PACKS.operator_approval_required],
      approval: { required: true },
    };
    const denied = evaluatePolicyPacks(input);
    expect(denied.allowed).toBe(false);
    expect(denied.reasons).toContain("approval_required");

    const approved = evaluatePolicyPacks({ ...input, approval: { required: true, approvedBy: "operator", approvalRef: "apr-1" } });
    expect(approved.allowed).toBe(true);
    emitPolicyDecisionArtifacts({ eventBus, operatorGraph: graph, recallForge: forge }, { ...input, approval: { required: true, approvedBy: "operator", approvalRef: "apr-1" } }, approved);
    expect(eventBus.list().at(-1)?.type).toBe("policy.evaluated");
    expect(graph.get("corr-3")?.spans[0]?.policyDecisionRef).toContain("policy:exec-3:corr-3");
    expect(forge.query("policy_outcome")).toHaveLength(1);
  });
});
