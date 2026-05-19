// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { InMemoryNautilusEventBus } from "./nautilus-event-fabric";
import { InMemoryRecallForge } from "./recallforge";
import { FailClosedApprovalGate } from "./threatmesh";
import { runTruthLoop } from "./nautilus-truth-loop";

describe("Nautilus truth loop", () => {
  it("runs started->completed with retrieval and memory provenance", async () => {
    const eventBus = new InMemoryNautilusEventBus();
    const memory = new InMemoryRecallForge();
    const report = await runTruthLoop(
      {
        eventBus,
        memoryStore: memory,
        policyGate: new FailClosedApprovalGate(),
        retriever: { retrieve: () => ({ result: { requestId: "r1", evidence: [{ sourceId: "doc" }], trust: [] }, trace: { requestId: "r1", cache: "miss", hops: [], replayToken: "replay-1" } }) },
        runtime: { run: async () => ({ ok: true }) },
      },
      { executionId: "exec-1", correlationId: "corr-1", action: "safe-op", query: "what now" },
    );

    expect(report.status).toBe("completed");
    expect(report.retrievalState).toBe("completed");
    expect(report.memoryRecorded).toBe(true);
    expect(memory.byExecution("exec-1")[0]?.provenanceEvent.type).toBe("execution.completed");
    expect(eventBus.list().map((e) => e.type)).toEqual(["execution.started", "policy.evaluated", "execution.completed"]);
  });

  it("fails closed when policy engine missing", async () => {
    const report = await runTruthLoop(
      {
        eventBus: new InMemoryNautilusEventBus(),
        runtime: { run: async () => ({}) },
      },
      { executionId: "exec-2", correlationId: "corr-2", action: "high-risk-op" },
    );
    expect(report.status).toBe("denied");
    expect(report.degraded).toContain("policy_engine_unavailable");
  });

  it("returns degraded retrieval path when retriever missing", async () => {
    const report = await runTruthLoop(
      {
        eventBus: new InMemoryNautilusEventBus(),
        policyGate: new FailClosedApprovalGate(),
        runtime: { run: async () => ({ ok: true }) },
      },
      { executionId: "exec-3", correlationId: "corr-3", action: "safe-op", query: "query" },
    );
    expect(report.status).toBe("completed");
    expect(report.retrievalState).toBe("unavailable");
    expect(report.degraded).toContain("retrieval_engine_unavailable");
  });

  it("records failed runtime path", async () => {
    const events = new InMemoryNautilusEventBus();
    const report = await runTruthLoop(
      {
        eventBus: events,
        policyGate: new FailClosedApprovalGate(),
        runtime: { run: async () => { throw new Error("runtime_unavailable"); } },
      },
      { executionId: "exec-4", correlationId: "corr-4", action: "safe-op" },
    );
    expect(report.status).toBe("failed");
    expect(events.list().at(-1)?.type).toBe("execution.failed");
  });
});


describe("proofpack continuity", () => {
  it("builds a proofpack for completed executions", async () => {
    const eventBus = new InMemoryNautilusEventBus();
    const memoryStore = new InMemoryRecallForge();
    const captured: string[] = [];

    const result = await runTruthLoop(
      {
        eventBus,
        memoryStore,
        policyGate: { evaluate: () => ({ allowed: true, reasons: ["ok"], action: "safe_action", trustScore: { value: 1, source: "test" }, riskSignals: [] }) },
        runtime: { run: async () => ({ ok: true }) },
        proofpackSink: (pack) => captured.push(pack.id),
      },
      {
        executionId: "exec-proofpack-1",
        correlationId: "corr-proofpack-1",
        action: "safe_action",
      },
    );

    expect(result.status).toBe("completed");
    expect(result.proofpackId).toBeDefined();
    expect(captured).toContain(result.proofpackId as string);
  });
});
