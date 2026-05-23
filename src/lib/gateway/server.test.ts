// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as http from "node:http";
import { ApiGateway } from "./server";

// Mock dependencies
vi.mock("../status-command-deps", () => ({
  buildStatusCommandDeps: vi.fn(() => ({})),
}));

vi.mock("../inventory-commands", () => ({
  getStatusReport: vi.fn(() => ({
    sandboxes: [
      { name: "test-sandbox", connected: true, isDefault: true },
    ]
  })),
}));

vi.mock("../runner", () => ({
  ROOT: "/mocked/root",
}));

describe("ApiGateway", () => {
  let gateway: ApiGateway;
  const PORT = 38080; // use an alternative port for tests

  beforeEach(async () => {
    gateway = new ApiGateway(PORT);
    await gateway.start();
  });

  afterEach(async () => {
    await gateway.stop();
  });

  async function fetchJson(path: string): Promise<{ status: number, data: any }> {
    const res = await fetch(`http://localhost:${PORT}${path}`);
    const data = await res.json();
    return { status: res.status, data };
  }

  it("should return ok for /health", async () => {
    const res = await fetchJson("/health");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: "ok" });
  });

  it("should return telemetry data for /telemetry", async () => {
    const res = await fetchJson("/telemetry");
    expect(res.status).toBe(200);
    expect(res.data.activeSandboxes).toBe(1);
    expect(res.data.totalSandboxes).toBe(1);
    expect(typeof res.data.timestamp).toBe("string");
  });

  it("should return sandbox data for /sandbox/:name/status", async () => {
    const res = await fetchJson("/sandbox/test-sandbox/status");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ name: "test-sandbox", connected: true, isDefault: true });
  });

  it("should return 404 for unknown sandbox", async () => {
    const res = await fetchJson("/sandbox/unknown/status");
    expect(res.status).toBe(404);
    expect(res.data).toEqual({ error: "sandbox not found" });
  });

  it("should return 404 for unknown endpoints", async () => {
    const res = await fetchJson("/unknown-endpoint");
    expect(res.status).toBe(404);
    expect(res.data).toEqual({ error: "not found" });
  });
});
