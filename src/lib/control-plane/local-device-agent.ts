// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "node:child_process";
import os from "node:os";

export interface NodeProfile {
  nodeId: string;
  hostname: string;
  platform: NodeJS.Platform;
  arch: string;
  osRelease: string;
}

export interface DeviceSnapshot {
  capturedAt: string;
  state: "healthy" | "degraded" | "unavailable";
  stale: boolean;
  staleReason?: string;
  cpu: { model: string; cores: number };
  memory: { totalBytes: number; freeBytes: number };
}

export interface GpuSnapshot {
  state: "observed" | "unavailable" | "unknown";
  source: "nvidia-smi" | "fallback" | "config";
  reason?: string;
  gpus: Array<{ index: number; name: string; memoryTotalMiB?: number; uuid?: string }>;
}

export interface RuntimeEndpointSnapshot {
  name: string;
  endpoint: string;
  state: "healthy" | "degraded" | "unavailable";
  statusCode?: number;
  reason?: string;
  observedAt: string;
}

export interface CapabilityReport {
  nodeProfile: NodeProfile;
  deviceSnapshot: DeviceSnapshot;
  gpuSnapshot: GpuSnapshot;
  runtimeEndpoints: RuntimeEndpointSnapshot[];
}

export const capabilityReportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["nodeProfile", "deviceSnapshot", "gpuSnapshot", "runtimeEndpoints"],
  properties: {
    nodeProfile: { type: "object", required: ["nodeId", "hostname", "platform", "arch", "osRelease"], properties: { nodeId: { type: "string" }, hostname: { type: "string" }, platform: { type: "string" }, arch: { type: "string" }, osRelease: { type: "string" } } },
    deviceSnapshot: { type: "object", required: ["capturedAt", "state", "stale", "cpu", "memory"], properties: { capturedAt: { type: "string" }, state: { type: "string" }, stale: { type: "boolean" }, staleReason: { type: "string" }, cpu: { type: "object", required: ["model", "cores"], properties: { model: { type: "string" }, cores: { type: "number" } } }, memory: { type: "object", required: ["totalBytes", "freeBytes"], properties: { totalBytes: { type: "number" }, freeBytes: { type: "number" } } } } },
    gpuSnapshot: { type: "object", required: ["state", "source", "gpus"], properties: { state: { type: "string" }, source: { type: "string" }, reason: { type: "string" }, gpus: { type: "array", items: { type: "object", required: ["index", "name"], properties: { index: { type: "number" }, name: { type: "string" }, memoryTotalMiB: { type: "number" }, uuid: { type: "string" } } } } } },
    runtimeEndpoints: { type: "array", items: { type: "object", required: ["name", "endpoint", "state", "observedAt"], properties: { name: { type: "string" }, endpoint: { type: "string" }, state: { type: "string" }, statusCode: { type: "number" }, reason: { type: "string" }, observedAt: { type: "string" } } } },
  },
} as const;

function parseNvidiaSmiCsv(text: string): GpuSnapshot["gpus"] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [name, memory, uuid] = line.split(",").map((v) => v.trim());
    const parsedMemory = Number.parseInt(memory, 10);
    return { index, name: name || "unknown", memoryTotalMiB: Number.isFinite(parsedMemory) ? parsedMemory : undefined, uuid: uuid || undefined };
  });
}

function probeNvidiaSmi(execImpl: typeof spawnSync = spawnSync): GpuSnapshot {
  const out = execImpl("nvidia-smi", ["--query-gpu=name,memory.total,uuid", "--format=csv,noheader,nounits"], { encoding: "utf8" });
  if (out.error) return { state: "unavailable", source: "fallback", reason: "nvidia-smi_unavailable", gpus: [] };
  if (out.status !== 0) return { state: "unavailable", source: "fallback", reason: "nvidia-smi_failed", gpus: [] };
  const gpus = parseNvidiaSmiCsv(String(out.stdout ?? ""));
  return gpus.length > 0 ? { state: "observed", source: "nvidia-smi", gpus } : { state: "unknown", source: "fallback", reason: "nvidia-smi_no_devices", gpus: [] };
}

async function probeRuntimeEndpoint(name: string, endpoint: string, timeoutMs: number): Promise<RuntimeEndpointSnapshot> {
  const started = new Date().toISOString();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(endpoint, { method: "GET", signal: controller.signal });
    clearTimeout(t);
    return { name, endpoint, state: resp.ok ? "healthy" : "degraded", statusCode: resp.status, observedAt: started, reason: resp.ok ? undefined : `http_${resp.status}` };
  } catch (error) {
    return { name, endpoint, state: "unavailable", observedAt: started, reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function generateCapabilityReport(opts?: {
  nowIso?: string;
  staleAfterMs?: number;
  lastObservedAtIso?: string;
  runtimeEndpoints?: Array<{ name: string; endpoint: string }>;
  manualGpuSnapshot?: GpuSnapshot;
  execImpl?: typeof spawnSync;
}): Promise<CapabilityReport> {
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const staleAfterMs = opts?.staleAfterMs ?? 5 * 60_000;
  const nodeProfile: NodeProfile = { nodeId: `${os.hostname()}@${process.pid}`, hostname: os.hostname(), platform: os.platform(), arch: os.arch(), osRelease: os.release() };
  const cpuInfo = os.cpus();
  const staleAge = opts?.lastObservedAtIso ? Date.parse(nowIso) - Date.parse(opts.lastObservedAtIso) : 0;
  const stale = Boolean(opts?.lastObservedAtIso && Number.isFinite(staleAge) && staleAge > staleAfterMs);
  const deviceSnapshot: DeviceSnapshot = {
    capturedAt: nowIso,
    state: "healthy",
    stale,
    staleReason: stale ? "telemetry_stale" : undefined,
    cpu: { model: cpuInfo[0]?.model ?? "unknown", cores: cpuInfo.length },
    memory: { totalBytes: os.totalmem(), freeBytes: os.freemem() },
  };

  const gpuSnapshot = opts?.manualGpuSnapshot ?? probeNvidiaSmi(opts?.execImpl);
  const endpointConfigs = opts?.runtimeEndpoints ?? [];
  const runtimeEndpoints = await Promise.all(endpointConfigs.map((r) => probeRuntimeEndpoint(r.name, r.endpoint, 1500)));
  return { nodeProfile, deviceSnapshot, gpuSnapshot, runtimeEndpoints };
}

export function formatCapabilityReportJson(report: CapabilityReport): string {
  return JSON.stringify(report, null, 2);
}

export { parseNvidiaSmiCsv, probeNvidiaSmi };
