// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { classifyTopology, TopologyNode } from "./topology";

describe("classifyTopology", () => {
  it("classifies nodes correctly", () => {
    const nowIso = "2024-01-01T12:00:00.000Z";
    const staleAfterMs = 60_000; // 1 minute

    const nodes: TopologyNode[] = [
      { id: "node-1", dependencies: [], lastSeenAt: "2024-01-01T11:59:30.000Z" }, // 30s ago (current)
      { id: "node-2", dependencies: [], lastSeenAt: "2024-01-01T11:58:30.000Z" }, // 90s ago (stale)
      { id: "node-3", dependencies: [] } // no lastSeenAt (unavailable)
    ];

    const result = classifyTopology(nodes, nowIso, staleAfterMs);

    expect(result).toEqual({
      "node-1": "current",
      "node-2": "stale",
      "node-3": "unavailable"
    });
  });

  it("handles empty nodes array", () => {
    const result = classifyTopology([], "2024-01-01T12:00:00.000Z", 60_000);
    expect(result).toEqual({});
  });

  it("classifies exactly at stale threshold as current", () => {
    const nowIso = "2024-01-01T12:00:00.000Z";
    const staleAfterMs = 60_000;

    const nodes: TopologyNode[] = [
      { id: "node-1", dependencies: [], lastSeenAt: "2024-01-01T11:59:00.000Z" } // exactly 60s ago
    ];

    const result = classifyTopology(nodes, nowIso, staleAfterMs);
    expect(result).toEqual({ "node-1": "current" });
  });

  it("classifies just over stale threshold as stale", () => {
    const nowIso = "2024-01-01T12:00:00.000Z";
    const staleAfterMs = 60_000;

    const nodes: TopologyNode[] = [
      { id: "node-1", dependencies: [], lastSeenAt: "2024-01-01T11:58:59.999Z" } // 60.001s ago
    ];

    const result = classifyTopology(nodes, nowIso, staleAfterMs);
    expect(result).toEqual({ "node-1": "stale" });
  });
});
