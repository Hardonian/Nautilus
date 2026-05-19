// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { buildNautilusEvent, InMemoryNautilusEventBus, validateNautilusEvent } from "./nautilus-event-fabric";
import { InMemoryRecallForge } from "./recallforge";
import { InMemoryOperatorGraph, eventToOperatorGraphSpan } from "./operatorgraph";
import { FailClosedApprovalGate } from "./threatmesh";
import { InMemorySemanticCache } from "./meshrag";
import { consumeOperatorGraphEvent, consumeRecallForgeEvent } from "./nautilus-pillar-wiring";

describe("Nautilus pillar foundations", () => {
  it("validates event envelope and taxonomy", () => {
    const event = buildNautilusEvent({ type: "execution.started", source: "test", payload: {}, status: "started" });
    expect(event.family).toBe("execution");
    expect(() => validateNautilusEvent(event)).not.toThrow();
    expect(() => validateNautilusEvent({ ...event, family: "runtime" })).toThrow(/mismatch/);
  });

  it("stores events in memory adapter", () => {
    const bus = new InMemoryNautilusEventBus();
    bus.emit(buildNautilusEvent({ type: "policy.evaluated", source: "threatmesh", payload: {} }));
    expect(bus.list()).toHaveLength(1);
  });

  it("enforces RecallForge provenance", () => {
    const forge = new InMemoryRecallForge();
    expect(() => forge.write({ id: "x", category: "policy_outcome", createdAt: new Date().toISOString(), provenanceEvent: { type: "memory.recorded", timestamp: "", source: "x" }, data: {} })).toThrow();
  });

  it("constructs trace/span and replay", () => {
    const graph = new InMemoryOperatorGraph();
    const span = eventToOperatorGraphSpan(buildNautilusEvent({ type: "trace.recorded", source: "operatorgraph", payload: {}, status: "completed" }), "t1", "s1");
    graph.append(span);
    expect(graph.get("t1")?.spans[0].executionStatus).toBe("completed");
  });

  it("applies fail-closed policy behavior", () => {
    const gate = new FailClosedApprovalGate();
    expect(gate.evaluate("dangerous-op", [{ id: "r1", severity: "critical", reason: "exfil risk" }]).allowed).toBe(false);
  });

  it("tracks retrieval cache hit/miss and lineage", () => {
    const cache = new InMemorySemanticCache();
    expect(cache.get("k1")).toEqual({ key: "k1", reason: "not_found" });
    cache.put("k1", { requestId: "r1", evidence: [{ sourceId: "doc1" }], trust: [{ sourceId: "doc1", score: 80, rationale: "trusted" }] });
    expect(cache.get("k1")).toMatchObject({ key: "k1" });
  });

  it("wires adapters between event fabric and pillars", () => {
    const forge = new InMemoryRecallForge();
    const graph = new InMemoryOperatorGraph();
    const event = buildNautilusEvent({ type: "execution.completed", source: "runner", payload: { ok: true }, status: "completed", executionId: "e1", correlationId: "c1" });
    consumeRecallForgeEvent(forge, event);
    consumeOperatorGraphEvent(graph, event);
    expect(forge.byExecution("e1")).toHaveLength(1);
    expect(graph.get("c1")?.spans).toHaveLength(1);
  });
});
