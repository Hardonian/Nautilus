// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { CleanupRegistry, boundedRetry, denyRemoteByDefault, unavailableDegraded } from "./r1-hardening";
import {
  compactContextPreservingEvidence,
  estimateTokenBudget,
  loadCheckpoint,
  replayCheckpoint,
  saveCheckpoint,
  taskFingerprint,
  reuseGuard,
  validateHandoffPacket,
} from "./r4-handoff-primitives";
import { QueueGovernance } from "./r5-queue-governance";
import { buildR5Proofpack, evaluateReleaseGate, runBenchmarkHarness, validateVerificationMatrixScripts } from "./r5-proofpack-release";

describe("R5 queue governance", () => {
  it("rejects over-capacity work with load-shed degraded receipt", () => {
    const q = new QueueGovernance({ maxCapacity: 1, maxRetries: 1, now: () => "2026-05-22T00:00:00.000Z" });
    q.enqueue({ queueId: "q1", idempotencyKey: "k1", payload: {} });
    const result = q.enqueue({ queueId: "q2", idempotencyKey: "k2", payload: {} });
    expect(result.outcome).toBe("load_shed");
    if (result.outcome === "load_shed") expect(result.degraded.reason).toBe("queue_over_capacity");
  });

  it("idempotent enqueue returns existing item and no duplicate work", () => {
    const q = new QueueGovernance({ maxCapacity: 2, maxRetries: 1 });
    const first = q.enqueue({ queueId: "q1", idempotencyKey: "same", payload: {} });
    const second = q.enqueue({ queueId: "q2", idempotencyKey: "same", payload: {} });
    expect(first.outcome).toBe("admitted");
    expect(second.outcome).toBe("existing");
    expect(q.queue.size).toBe(1);
  });

  it("retry exhaustion moves to dead letter and records timeline", () => {
    const q = new QueueGovernance({ maxCapacity: 2, maxRetries: 1, now: () => "2026-05-22T00:00:00.000Z" });
    q.enqueue({ queueId: "q1", idempotencyKey: "k1", payload: {} });
    q.markRetry("q1");
    const item = q.markRetry("q1");
    expect(item.status).toBe("dead_letter");
    expect(q.timeline.map((e) => e.type)).toEqual(["admitted", "retried", "dead_letter"]);
  });
});

describe("R4 primitives", () => {
  it("validates handoff required fields", () => {
    expect(validateHandoffPacket({ schemaVersion: "1.0.0" as const })).toEqual({ ok: false, reason: "missing_required_fields" });
  });

  it("compaction preserves evidence links", () => {
    const compacted = compactContextPreservingEvidence({ schemaVersion: "1.0.0", runId: "r", taskId: "t", step: "plan", objective: "x", evidenceRefs: [{ id: "ev1", link: "file://x" }], context: ["a", "b", "c"], createdAt: "2026-05-22T00:00:00.000Z" }, 1);
    expect(compacted.context).toEqual(["c"]);
    expect(compacted.evidenceRefs).toEqual([{ id: "ev1", link: "file://x" }]);
  });

  it("fingerprint enables safe reuse guard", () => {
    const fp = taskFingerprint({ objective: "ship", constraints: ["a"], inputs: ["b"] });
    const cache = new Map([[fp, { safeToReuse: true, result: { ok: true } }]]);
    expect(reuseGuard(cache, fp)).toEqual({ reused: true, result: { ok: true } });
  });

  it("returns degraded on token overflow before execution", () => {
    const budget = estimateTokenBudget({ strings: ["x".repeat(500)], budget: 10 });
    expect(budget.overBudget).toBe(true);
    expect(budget.degraded?.reason).toBe("token_budget_overflow");
  });

  it("checkpoint round trip preserves run/task status", () => {
    const raw = saveCheckpoint({ runId: "r1", taskId: "t1", status: "degraded", checkpointAt: "2026-05-22T00:00:00.000Z", replayCursor: "c1" });
    expect(replayCheckpoint(loadCheckpoint(raw))).toEqual({ runId: "r1", taskId: "t1", status: "degraded", replayCursor: "c1" });
  });
});

describe("R1 hardening", () => {
  it("bounded retry stops within attempts/time", async () => {
    const result = await boundedRetry(async () => {
      throw new Error("nope");
    }, { maxAttempts: 2, maxTotalMs: 100, backoffMs: 1 });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBeLessThanOrEqual(2);
  });

  it("trust boundary denies remote by default", () => {
    expect(denyRemoteByDefault({})).toEqual({ allowed: false, reason: "remote_execution_disabled_by_default" });
  });

  it("unavailable helpers emit explicit degraded reason", () => {
    expect(unavailableDegraded({ kind: "gpu", source: "probe", message: "no gpu" }).reasonCode).toBe("gpu_unavailable");
  });

  it("cleanup registry calls cleanups exactly once", async () => {
    let count = 0;
    const reg = new CleanupRegistry();
    reg.register(() => {
      count += 1;
    });
    await reg.runOnce();
    await reg.runOnce();
    expect(count).toBe(1);
  });
});

describe("R5 proofpack/release gate/benchmark", () => {
  it("proofpack includes routing queue and degraded evidence", () => {
    const proof = buildR5Proofpack({ queueTimeline: [{ type: "admitted", queueId: "q1" }], routingDecision: { selected: "local", reason: "policy" }, degradedReasons: ["gpu_unavailable"], checkpoint: { runId: "r", taskId: "t", replayCursor: "c" }, verification: { scripts: ["test:unit"], executedAt: "2026-05-22T00:00:00.000Z" } });
    expect(proof).toMatchObject({ queue: { timeline: [{ type: "admitted" }] }, routing: { selected: "local" }, degraded: ["gpu_unavailable"] });
  });

  it("benchmark returns unavailable without runtime", async () => {
    expect(await runBenchmarkHarness({ runtimeAvailable: false, reasonIfUnavailable: "runtime_missing" })).toEqual({ status: "unavailable", reason: "runtime_missing" });
  });

  it("benchmark captures callable latency when runtime available", async () => {
    const out = await runBenchmarkHarness({ runtimeAvailable: true, callable: async () => Promise.resolve() });
    expect(out.status).toBe("ok");
  });

  it("release gate fails unresolved high severity unless waived", () => {
    expect(evaluateReleaseGate([{ id: "g1", severity: "high", resolved: false }], []).pass).toBe(false);
    expect(evaluateReleaseGate([{ id: "g1", severity: "high", resolved: false }], [{ gapId: "g1", approvedBy: "ops" }]).pass).toBe(true);
  });

  it("verification matrix check fails on missing script reference", () => {
    expect(validateVerificationMatrixScripts({ referencedScripts: ["test:unit", "does-not-exist"], packageScripts: { "test:unit": "vitest" } })).toEqual({ ok: false, missing: ["does-not-exist"] });
  });
});
