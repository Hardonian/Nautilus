// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type FederationState = "online" | "offline" | "degraded";
export type TrustBoundary = "trusted" | "restricted" | "untrusted";

export interface EdgeNodeRegistration {
  nodeId: string;
  role: "orchestrator" | "retrieval" | "reasoning" | "control-plane";
  capabilities: string[];
  trustBoundary: TrustBoundary;
  lastSeenAt: string;
}

export interface RemoteExecutionContract {
  executionId: string;
  traceId: string;
  targetNodeId: string;
  approved: boolean;
  denialReason?: string;
  failClosed: boolean;
}

export interface FederationSnapshot {
  state: FederationState;
  nodes: EdgeNodeRegistration[];
  offlineNodeIds: string[];
  degradedReasons: string[];
}

export class EdgeMeshRegistry {
  private readonly nodes = new Map<string, EdgeNodeRegistration>();

  register(node: EdgeNodeRegistration): void {
    if (!node.nodeId) throw new Error("nodeId is required");
    if (!node.lastSeenAt || Number.isNaN(Date.parse(node.lastSeenAt))) {
      throw new Error("lastSeenAt must be valid ISO-8601");
    }
    this.nodes.set(node.nodeId, { ...node, capabilities: [...node.capabilities] });
  }

  snapshot(nowIso: string, staleAfterMs = 60_000): FederationSnapshot {
    if (Number.isNaN(Date.parse(nowIso))) throw new Error("nowIso must be valid ISO-8601");
    const now = Date.parse(nowIso);
    const nodes = [...this.nodes.values()];
    const offlineNodeIds = nodes.filter((node) => now - Date.parse(node.lastSeenAt) > staleAfterMs).map((node) => node.nodeId);
    const degradedReasons: string[] = [];
    if (offlineNodeIds.length > 0) degradedReasons.push("offline_nodes_detected");
    if (nodes.some((node) => node.trustBoundary === "untrusted")) degradedReasons.push("untrusted_boundary_present");

    const state: FederationState =
      nodes.length === 0 || offlineNodeIds.length === nodes.length
        ? "offline"
        : degradedReasons.length > 0
          ? "degraded"
          : "online";

    return { state, nodes, offlineNodeIds, degradedReasons };
  }
}

export function evaluateRemoteExecutionApproval(input: {
  action: "dispatch_remote_execution";
  targetNode: EdgeNodeRegistration | undefined;
  operatorApproved: boolean;
}): RemoteExecutionContract {
  if (!input.targetNode) {
    return {
      executionId: "unknown",
      traceId: "unknown",
      targetNodeId: "unknown",
      approved: false,
      denialReason: "target_node_unavailable",
      failClosed: true,
    };
  }
  if (input.targetNode.trustBoundary === "untrusted") {
    return {
      executionId: "unknown",
      traceId: "unknown",
      targetNodeId: input.targetNode.nodeId,
      approved: false,
      denialReason: "target_node_untrusted",
      failClosed: true,
    };
  }
  if (!input.operatorApproved) {
    return {
      executionId: "unknown",
      traceId: "unknown",
      targetNodeId: input.targetNode.nodeId,
      approved: false,
      denialReason: "operator_approval_required",
      failClosed: true,
    };
  }
  return {
    executionId: "unknown",
    traceId: "unknown",
    targetNodeId: input.targetNode.nodeId,
    approved: true,
    failClosed: true,
  };
}
