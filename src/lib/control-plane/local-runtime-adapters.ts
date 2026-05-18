// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "node:child_process";

export type LocalRuntimeKind = "ollama" | "llama.cpp" | "openai-compatible" | "degraded";
export type AdapterState = "available" | "unavailable" | "degraded";

export interface RuntimeModelInfo { id: string; contextWindow?: number; }
export interface RuntimeCapabilitySnapshot {
  runtime: LocalRuntimeKind;
  state: AdapterState;
  streaming: boolean;
  tools: boolean;
  jsonMode: boolean;
  embeddings: boolean;
  vision: boolean;
  modelCount: number;
  degradedReason?: string;
}

export interface LocalRuntimeExecutionRequest {
  prompt: string;
  model?: string;
  timeoutMs?: number;
  retries?: number;
}

export interface LocalRuntimeExecutionResult {
  ok: boolean;
  runtime: LocalRuntimeKind;
  state: AdapterState;
  output?: string;
  degradedReason?: string;
  attempts: number;
  durationMs: number;
  error?: string;
}

export interface RuntimeAdapter {
  kind: LocalRuntimeKind;
  detect(): { state: AdapterState; detail: string };
  health(timeoutMs?: number): Promise<{ state: AdapterState; detail: string }>;
  listModels(timeoutMs?: number): Promise<RuntimeModelInfo[]>;
  capabilities(timeoutMs?: number): Promise<RuntimeCapabilitySnapshot>;
  execute(request: LocalRuntimeExecutionRequest): Promise<LocalRuntimeExecutionResult>;
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function commandAvailable(command: string): boolean {
  const out = spawnSync("bash", ["-lc", `command -v ${command}`], { stdio: "pipe", encoding: "utf8" });
  return out.status === 0;
}

class DegradedAdapter implements RuntimeAdapter {
  kind: LocalRuntimeKind = "degraded";
  detect() { return { state: "degraded" as const, detail: "no supported local runtime detected" }; }
  async health() { return { state: "degraded" as const, detail: "no runtime available" }; }
  async listModels() { return []; }
  async capabilities() { return { runtime: this.kind, state: "degraded", streaming: false, tools: false, jsonMode: false, embeddings: false, vision: false, modelCount: 0, degradedReason: "unsupported_environment" }; }
  async execute(): Promise<LocalRuntimeExecutionResult> {
    return { ok: false, runtime: this.kind, state: "degraded", attempts: 1, durationMs: 0, degradedReason: "unsupported_environment", error: "No local runtime adapter available" };
  }
}

class HttpAdapter implements RuntimeAdapter {
  constructor(
    public kind: LocalRuntimeKind,
    private baseUrl: string,
    private modelListPath: string,
    private healthPath: string,
    private supportsTools: boolean,
  ) {}
  detect() {
    if (this.kind === "ollama" && !commandAvailable("ollama")) return { state: "degraded" as const, detail: "ollama command unavailable" };
    if (this.kind === "llama.cpp" && !commandAvailable("llama-server")) return { state: "degraded" as const, detail: "llama-server command unavailable" };
    return { state: "available" as const, detail: `${this.kind} configured at ${this.baseUrl}` };
  }
  async health(timeoutMs = 2000) {
    try {
      const r = await fetchWithTimeout(new URL(this.healthPath, this.baseUrl).toString(), timeoutMs);
      return r.ok ? { state: "available" as const, detail: `http ${r.status}` } : { state: "degraded" as const, detail: `http ${r.status}` };
    } catch (e) {
      return { state: "unavailable" as const, detail: e instanceof Error ? e.message : String(e) };
    }
  }
  async listModels(timeoutMs = 3000): Promise<RuntimeModelInfo[]> {
    try {
      const r = await fetchWithTimeout(new URL(this.modelListPath, this.baseUrl).toString(), timeoutMs);
      if (!r.ok) return [];
      const payload = (await r.json()) as { models?: Array<{ name?: string; id?: string; context_length?: number }> ; data?: Array<{ id?: string }>};
      if (Array.isArray(payload.models)) return payload.models.map((m) => ({ id: m.name ?? m.id ?? "unknown", contextWindow: m.context_length })).filter((m) => m.id !== "unknown");
      if (Array.isArray(payload.data)) return payload.data.map((m) => ({ id: m.id ?? "unknown" })).filter((m) => m.id !== "unknown");
      return [];
    } catch {
      return [];
    }
  }
  async capabilities(timeoutMs = 3000): Promise<RuntimeCapabilitySnapshot> {
    const h = await this.health(timeoutMs);
    const models = await this.listModels(timeoutMs);
    return { runtime: this.kind, state: h.state === "available" ? "available" : "degraded", streaming: true, tools: this.supportsTools, jsonMode: true, embeddings: this.kind !== "llama.cpp", vision: false, modelCount: models.length, degradedReason: h.state === "available" ? undefined : h.detail };
  }
  async execute(request: LocalRuntimeExecutionRequest): Promise<LocalRuntimeExecutionResult> {
    const started = Date.now();
    const retries = Math.max(0, request.retries ?? 1);
    let lastError = "";
    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      try {
        const endpoint = new URL("/v1/chat/completions", this.baseUrl).toString();
        const response = await fetchWithTimeout(endpoint, request.timeoutMs ?? 10_000, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: request.model ?? "", messages: [{ role: "user", content: request.prompt }], stream: false }),
        });
        if (!response.ok) throw new Error(`http_${response.status}`);
        const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const output = payload.choices?.[0]?.message?.content ?? "";
        return { ok: true, runtime: this.kind, state: "available", output, attempts: attempt, durationMs: Date.now() - started };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    return { ok: false, runtime: this.kind, state: "degraded", attempts: retries + 1, durationMs: Date.now() - started, degradedReason: "execution_failed", error: lastError };
  }
}

export function selectLocalRuntimeAdapter(env: NodeJS.ProcessEnv = process.env): RuntimeAdapter {
  if (env.NEMOCLAW_OLLAMA_URL) return new HttpAdapter("ollama", env.NEMOCLAW_OLLAMA_URL, "/api/tags", "/api/version", true);
  if (env.NEMOCLAW_LLAMACPP_URL) return new HttpAdapter("llama.cpp", env.NEMOCLAW_LLAMACPP_URL, "/v1/models", "/health", false);
  if (env.NEMOCLAW_OPENAI_COMPAT_URL) return new HttpAdapter("openai-compatible", env.NEMOCLAW_OPENAI_COMPAT_URL, "/v1/models", "/health", true);
  return new DegradedAdapter();
}

export async function runLocalRuntimeSmoke(env: NodeJS.ProcessEnv = process.env): Promise<LocalRuntimeExecutionResult> {
  const adapter = selectLocalRuntimeAdapter(env);
  const detection = adapter.detect();
  if (detection.state !== "available") {
    return { ok: false, runtime: adapter.kind, state: detection.state, attempts: 1, durationMs: 0, degradedReason: detection.detail, error: "runtime_unavailable" };
  }
  return adapter.execute({ prompt: "Respond with 'ok'.", timeoutMs: 5000, retries: 0 });
}
