// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { buildOperatorConsoleSurface, type OperatorConsoleInput } from "./operator-console";

describe("buildOperatorConsoleSurface", () => {
  const baseInput: OperatorConsoleInput = {
    executionId: "exec-123",
    traceId: "trace-456",
    topology: { nodes: [] },
    timeline: { events: [] },
    degraded: [],
    health: { state: "healthy", details: ["All systems go"] },
    outcome: { status: "completed", summary: "Success" },
    memoryProvenance: [],
  };

  it("handles ready states with all data provided", () => {
    const input: OperatorConsoleInput = {
      ...baseInput,
      topology: { nodes: ["node-a", "node-b"] },
      timeline: { events: [{ at: "now", status: "ok", summary: "test event" }] },
      replay: { traceId: "trace-456", spans: [], edges: [], snapshots: [] },
      retrieval: { ref: "retrieval-ref", state: "completed", lineage: ["doc1", "doc2"] },
      policy: {
        ref: "policy-ref",
        decision: { action: "read", allowed: true, reasons: ["looks good"], trustScore: { value: 100, source: "test" }, riskSignals: [] }
      },
      degraded: ["degraded reason 1"],
      memoryProvenance: [{
        id: "mem-ref",
        category: "execution_lineage",
        createdAt: "now",
        provenanceEvent: { type: "test", timestamp: "now", source: "test", executionId: "exec-123", correlationId: "corr-1" },
        data: {}
      }],
    };

    const surface = buildOperatorConsoleSurface(input);

    expect(surface.executionId).toBe("exec-123");
    expect(surface.traceId).toBe("trace-456");
    expect(surface.topology.state).toBe("ready");
    expect(surface.topology.details).toBe("2 runtime node(s) observed");
    expect(surface.timeline.state).toBe("ready");
    expect(surface.timeline.details).toBe("1 event(s) recorded");
    expect(surface.replay.state).toBe("ready");
    expect(surface.replay.reference).toBe("trace-456");
    expect(surface.retrievalLineage.state).toBe("ready");
    expect(surface.retrievalLineage.reference).toBe("retrieval-ref");
    expect(surface.policyEvaluation.state).toBe("ready");
    expect(surface.policyEvaluation.details).toBe("Policy allowed with 1 reason(s)");
    expect(surface.degradedStates.explicit).toBe(true);
    expect(surface.degradedStates.reasons).toEqual(["degraded reason 1"]);
    expect(surface.memoryProvenance.state).toBe("ready");
    expect(surface.memoryProvenance.references).toEqual(["mem-ref"]);
  });

  it("handles empty states with no data", () => {
    const surface = buildOperatorConsoleSurface(baseInput);

    expect(surface.topology.state).toBe("empty");
    expect(surface.topology.details).toBe("No runtime topology observed for this execution");
    expect(surface.timeline.state).toBe("empty");
    expect(surface.timeline.details).toBe("No timeline events recorded");
    expect(surface.replay.state).toBe("empty");
    expect(surface.replay.details).toBe("Replay not captured for this execution");
    expect(surface.retrievalLineage.state).toBe("empty");
    expect(surface.retrievalLineage.details).toBe("No retrieval lineage captured");
    expect(surface.policyEvaluation.state).toBe("empty");
    expect(surface.policyEvaluation.details).toBe("No policy evaluation attached");
    expect(surface.degradedStates.explicit).toBe(false);
    expect(surface.degradedStates.reasons).toEqual([]);
    expect(surface.memoryProvenance.state).toBe("empty");
    expect(surface.memoryProvenance.references).toEqual([]);
  });

  it("handles unavailable states with explicit reasons", () => {
    const input: OperatorConsoleInput = {
      ...baseInput,
      topology: { nodes: [], unavailableReason: "Topology service offline" },
      timeline: { events: [], unavailableReason: "Timeline service offline" },
      replay: { traceId: "trace-456", spans: [], edges: [], snapshots: [], unavailableReason: "Replay storage offline" },
      retrieval: { state: "unavailable", lineage: [] },
      policy: { unavailableReason: "Policy engine offline" },
    };

    const surface = buildOperatorConsoleSurface(input);

    expect(surface.topology.state).toBe("unavailable");
    expect(surface.topology.details).toBe("Topology unavailable: Topology service offline");
    expect(surface.timeline.state).toBe("unavailable");
    expect(surface.timeline.details).toBe("Timeline unavailable: Timeline service offline");
    expect(surface.replay.state).toBe("unavailable");
    expect(surface.replay.details).toBe("Replay unavailable: Replay storage offline");
    expect(surface.retrievalLineage.state).toBe("unavailable");
    expect(surface.retrievalLineage.details).toBe("Retrieval lineage unavailable");
    expect(surface.policyEvaluation.state).toBe("unavailable");
    expect(surface.policyEvaluation.details).toBe("Policy unavailable: Policy engine offline");
  });
});
