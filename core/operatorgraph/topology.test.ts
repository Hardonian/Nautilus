// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { classifyTopology, type TopologyNode } from "./topology";

describe("classifyTopology", () => {
  it("returns empty object for empty nodes list", () => {
    expect(classifyTopology([], "2026-05-09T00:00:00.000Z", 5000)).toEqual({});
  });

  it("classifies node as unavailable if lastSeenAt is missing", () => {
    const nodes: TopologyNode[] = [{ id: "node-1", dependencies: [] }];
    expect(classifyTopology(nodes, "2026-05-09T00:00:00.000Z", 5000)).toEqual({
      "node-1": "unavailable"
    });
  });

  it("classifies node as stale if lastSeenAt is older than staleAfterMs", () => {
    const nodes: TopologyNode[] = [{ id: "node-1", lastSeenAt: "2026-05-09T00:00:00.000Z", dependencies: [] }];
    // 6 seconds later > 5000ms
    expect(classifyTopology(nodes, "2026-05-09T00:00:06.000Z", 5000)).toEqual({
      "node-1": "stale"
    });
  });

  it("classifies node as current if lastSeenAt is within staleAfterMs", () => {
    const nodes: TopologyNode[] = [{ id: "node-1", lastSeenAt: "2026-05-09T00:00:00.000Z", dependencies: [] }];
    // 4 seconds later <= 5000ms
    expect(classifyTopology(nodes, "2026-05-09T00:00:04.000Z", 5000)).toEqual({
      "node-1": "current"
    });
  });

  it("classifies node as stale if exactly at staleAfterMs margin but logic uses strictly greater than", () => {
    const nodes: TopologyNode[] = [{ id: "node-1", lastSeenAt: "2026-05-09T00:00:00.000Z", dependencies: [] }];
    // exactly 5 seconds later
    expect(classifyTopology(nodes, "2026-05-09T00:00:05.000Z", 5000)).toEqual({
      "node-1": "current"
    });
  });

  it("handles a mix of node states correctly", () => {
  it("classifies node as current when exactly at staleAfterMs boundary because comparison is strictly greater than", () => {
      { id: "node-unavailable", dependencies: [] },
      { id: "node-stale", lastSeenAt: "2026-05-09T00:00:00.000Z", dependencies: [] },
      { id: "node-current", lastSeenAt: "2026-05-09T00:00:08.000Z", dependencies: [] }
    ];
    expect(classifyTopology(nodes, "2026-05-09T00:00:10.000Z", 5000)).toEqual({
      "node-unavailable": "unavailable",
      "node-stale": "stale",     // 10s difference > 5s
      "node-current": "current"  // 2s difference <= 5s
    });
  });
});
