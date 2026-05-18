// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { EdgeMeshRegistry, evaluateRemoteExecutionApproval } from "./edge-mesh";

describe("edge mesh", () => {
  it("marks stale nodes offline and reports degraded federation", () => {
    const registry = new EdgeMeshRegistry();
    registry.register({
      nodeId: "hx370",
      role: "orchestrator",
      capabilities: ["planning"],
      trustBoundary: "trusted",
      lastSeenAt: "2026-05-18T09:59:00.000Z",
    });
    registry.register({
      nodeId: "v100",
      role: "reasoning",
      capabilities: ["gpu"],
      trustBoundary: "trusted",
      lastSeenAt: "2026-05-18T10:01:00.000Z",
    });

    const snapshot = registry.snapshot("2026-05-18T10:01:30.000Z", 60_000);
    expect(snapshot.state).toBe("degraded");
    expect(snapshot.offlineNodeIds).toContain("hx370");
    expect(snapshot.degradedReasons).toContain("offline_nodes_detected");
  });

  it("fails closed for untrusted nodes and missing operator approval", () => {
    const deniedUntrusted = evaluateRemoteExecutionApproval({
      action: "dispatch_remote_execution",
      operatorApproved: true,
      targetNode: {
        nodeId: "radxa",
        role: "control-plane",
        capabilities: [],
        trustBoundary: "untrusted",
        lastSeenAt: "2026-05-18T10:00:00.000Z",
      },
    });
    expect(deniedUntrusted.approved).toBe(false);
    expect(deniedUntrusted.failClosed).toBe(true);
    expect(deniedUntrusted.denialReason).toBe("target_node_untrusted");

    const deniedApproval = evaluateRemoteExecutionApproval({
      action: "dispatch_remote_execution",
      operatorApproved: false,
      targetNode: {
        nodeId: "p40",
        role: "retrieval",
        capabilities: ["vector-retrieval"],
        trustBoundary: "trusted",
        lastSeenAt: "2026-05-18T10:00:00.000Z",
      },
    });
    expect(deniedApproval.approved).toBe(false);
    expect(deniedApproval.denialReason).toBe("operator_approval_required");
  });
});
