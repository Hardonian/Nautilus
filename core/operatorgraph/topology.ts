// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type TopologyNodeStatus = 'current' | 'stale' | 'unavailable';

export interface TopologyNode {
  id: string;
  lastSeenAt?: string;
  dependencies: string[];
}

export function classifyTopology(nodes: TopologyNode[], nowIso: string, staleAfterMs: number): Record<string, TopologyNodeStatus> {
  const now = Date.parse(nowIso);
  return Object.fromEntries(
    nodes.map((node) => {
      if (!node.lastSeenAt) return [node.id, 'unavailable'];
      return [node.id, now - Date.parse(node.lastSeenAt) > staleAfterMs ? 'stale' : 'current'];
    }),
  );
}
