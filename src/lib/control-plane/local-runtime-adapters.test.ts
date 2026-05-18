// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { runLocalRuntimeSmoke, selectLocalRuntimeAdapter } from "./local-runtime-adapters";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("local runtime adapters", () => {
  it("returns degraded adapter when no provider is configured", async () => {
    const adapter = selectLocalRuntimeAdapter({});
    expect(adapter.kind).toBe("degraded");
    expect(adapter.detect().state).toBe("degraded");
    await expect(adapter.listModels()).resolves.toEqual([]);
  });

  it("marks ollama unavailable when health probe fails", async () => {
    vi.stubEnv("NEMOCLAW_OLLAMA_URL", "http://127.0.0.1:65535");
    const adapter = selectLocalRuntimeAdapter(process.env);
    const health = await adapter.health(5);
    expect(health.state).toBe("unavailable");
  });

  it("normalizes capability snapshot and model listing", async () => {
    vi.stubEnv("NEMOCLAW_OPENAI_COMPAT_URL", "http://localhost:1234");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/health")) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (url.endsWith("/v1/models")) return new Response(JSON.stringify({ data: [{ id: "mistral" }] }), { status: 200 });
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
    });
    const adapter = selectLocalRuntimeAdapter(process.env);
    const caps = await adapter.capabilities();
    expect(caps.runtime).toBe("openai-compatible");
    expect(caps.state).toBe("available");
    expect(caps.modelCount).toBe(1);
  });

  it("handles execution timeout with retries", async () => {
    vi.stubEnv("NEMOCLAW_OPENAI_COMPAT_URL", "http://localhost:1234");
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      throw new Error("timeout");
    });
    const adapter = selectLocalRuntimeAdapter(process.env);
    const result = await adapter.execute({ prompt: "hi", retries: 2, timeoutMs: 10 });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(calls).toBe(3);
  });

  it("smoke command returns explicit degraded state when unavailable", async () => {
    const result = await runLocalRuntimeSmoke({});
    expect(result.ok).toBe(false);
    expect(result.state).toBe("degraded");
    expect(result.error).toBe("runtime_unavailable");
  });
});
