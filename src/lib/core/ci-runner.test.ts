// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from "vitest";
import { NautilusCIRunner } from "./ci-runner";
import { InMemoryNautilusEventBus } from "./nautilus-event-fabric";
import type { TruthLoopDependencies, RuntimeExecutor } from "./nautilus-truth-loop";
import type { ApprovalGate } from "./threatmesh";

describe("NautilusCIRunner", () => {
  it("should return exitCode 0 on success", async () => {
    const eventBus = new InMemoryNautilusEventBus();
    const runtime: RuntimeExecutor = {
      run: vi.fn().mockResolvedValue({ success: true }),
    };
    const policyGate: ApprovalGate = {
      evaluate: vi.fn().mockReturnValue({ allowed: true, reasons: [], action: "test", trustScore: { value: 100, source: "mock" }, riskSignals: [] }),
    };

    const runner = new NautilusCIRunner({
      eventBus,
      runtime,
      policyGate,
      traceWriter: {} as any, // Mock trace store
    });

    const result = await runner.run({
      executionId: "exec-123",
      correlationId: "corr-123",
      action: "test action",
    });

    expect(result.exitCode).toBe(0);
    expect(result.report.status).toBe("completed");
  });

  it("should return exitCode 2 on policy deny", async () => {
    const eventBus = new InMemoryNautilusEventBus();
    const runtime: RuntimeExecutor = {
      run: vi.fn(),
    };
    const policyGate: ApprovalGate = {
      evaluate: vi.fn().mockReturnValue({ allowed: false, reasons: ["blocked"], action: "test", trustScore: { value: 0, source: "mock" }, riskSignals: [] }),
    };

    const runner = new NautilusCIRunner({
      eventBus,
      runtime,
      policyGate,
    });

    const result = await runner.run({
      executionId: "exec-123",
      correlationId: "corr-123",
      action: "test action",
    });

    expect(result.exitCode).toBe(2);
    expect(result.report.status).toBe("denied");
  });

  it("should return exitCode 4 on degraded state when failOnDegraded is true", async () => {
    const eventBus = new InMemoryNautilusEventBus();
    const runtime: RuntimeExecutor = {
      run: vi.fn().mockResolvedValue({ success: true }),
    };
    const policyGate: ApprovalGate = {
      evaluate: vi.fn().mockReturnValue({ allowed: true, reasons: [], action: "test", trustScore: { value: 100, source: "mock" }, riskSignals: [] }),
    };

    // Note: No traceWriter, memoryStore, or retriever provided => leads to degraded states.
    const runner = new NautilusCIRunner({
      eventBus,
      runtime,
      policyGate,
    });

    const result = await runner.run({
      executionId: "exec-123",
      correlationId: "corr-123",
      action: "test action",
      failOnDegraded: true, // Trigger exitCode 4
    });

    expect(result.exitCode).toBe(4);
    expect(result.report.status).toBe("completed"); // Technically completed runtime
    expect(result.report.degraded.length).toBeGreaterThan(0);
  });
});
