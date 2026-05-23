// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PolicyDecision } from "./threatmesh";

export type RuntimeType = "ollama" | "llama.cpp" | "vllm" | "local" | "future";
export type AvailabilityState = "available" | "degraded" | "offline";
export type QueueState = "idle" | "queued" | "saturated" | "unknown";
export type TelemetryValue<T> = { state: "known"; value: T } | { state: "unknown" } | { state: "unsupported"; reason: string };

export interface Node { id: string; label: string; region?: string; runtimeType: RuntimeType; }
export interface GPUDevice {
  id: string;
  model: string;
  availableVramMiB: TelemetryValue<number>;
  thermalState: TelemetryValue<"nominal" | "warm" | "hot">;
  quantizationSupport: TelemetryValue<string[]>;
}
export interface CapabilityProfile {
  runtimeType: RuntimeType;
  supportedRuntimes: string[];
  inferenceEngine: string;
  supportsEmbedding: boolean;
  supportsReasoning: boolean;
  supportsMultimodal: boolean;
  supportsStreaming: boolean;
  supportsToolCall: boolean;
  maxContextTokens: TelemetryValue<number>;
  quantizationSupport: string[];
}
export interface RuntimeHealth {
  availabilityState: AvailabilityState;
  degradedState: boolean;
  offlineState: boolean;
  queueState: QueueState;
  notes?: string[];
}
export interface RuntimeNode extends Node {
  gpu: GPUDevice[];
  capabilityProfile: CapabilityProfile;
  health: RuntimeHealth;
}

export type WorkloadClass = "embedding" | "reasoning" | "multimodal" | "tool_call" | "general";
export interface RuntimeConstraint {
  minVramMiB?: number;
  requiresStreaming?: boolean;
  requiredRuntimeTypes?: RuntimeType[];
  requiredQuantization?: string;
  allowDegraded?: boolean;
}
export interface ResourceSnapshot { capturedAt: string; nodes: RuntimeNode[]; source: "observed" | "declared"; }
export interface ExecutionPlacement { nodeId: string; runtimeType: RuntimeType; reason: string; degraded: boolean; }
export interface RuntimeState { snapshot: ResourceSnapshot; placements: ExecutionPlacement[]; }

export interface ExecutionPlan {
  selectedRuntime: RuntimeType;
  selectedNode: string;
  rationale: string[];
  rejectedNodes: Array<{ nodeId: string; reasons: string[] }>;
  constraints: RuntimeConstraint;
  fallbackPath: ExecutionPlacement[];
  degradedPath: ExecutionPlacement[];
  policyReferences: string[];
}

export function classifyWorkload(input: { prompt?: string; wantsTools?: boolean; wantsVision?: boolean; embeddingOnly?: boolean }): WorkloadClass {
  if (input.embeddingOnly) return "embedding";
  if (input.wantsVision) return "multimodal";
  if (input.wantsTools) return "tool_call";
  if ((input.prompt ?? "").length > 2000) return "reasoning";
  return "general";
}

function supportsWorkload(node: RuntimeNode, workload: WorkloadClass): boolean {
  if (workload === "embedding") return node.capabilityProfile.supportsEmbedding;
  if (workload === "reasoning") return node.capabilityProfile.supportsReasoning;
  if (workload === "multimodal") return node.capabilityProfile.supportsMultimodal;
  if (workload === "tool_call") return node.capabilityProfile.supportsToolCall;
  return true;
}

function deterministicNodeOrder(nodes: RuntimeNode[]): RuntimeNode[] {
  return [...nodes].sort((a, b) => a.id.localeCompare(b.id));
}

export function createExecutionPlan(input: {
  snapshot: ResourceSnapshot;
  workload: WorkloadClass;
  constraints: RuntimeConstraint;
  policyDecision: PolicyDecision;
}): ExecutionPlan {
  if (!input.policyDecision.allowed) {
    throw new Error(`Execution denied by policy: ${input.policyDecision.reasons.join(";")}`);
  }

  const rejectedNodes: Array<{ nodeId: string; reasons: string[] }> = [];
  const candidates = deterministicNodeOrder(input.snapshot.nodes).filter((node) => {
    const reasons: string[] = [];
    if (!supportsWorkload(node, input.workload)) reasons.push(`unsupported_workload:${input.workload}`);
    if (node.health.offlineState || node.health.availabilityState === "offline") reasons.push("runtime_offline");
    if (!input.constraints.allowDegraded && node.health.degradedState) reasons.push("degraded_disallowed");
    if (input.constraints.requiredRuntimeTypes && !input.constraints.requiredRuntimeTypes.includes(node.runtimeType)) reasons.push("runtime_type_mismatch");
    if (input.constraints.requiresStreaming && !node.capabilityProfile.supportsStreaming) reasons.push("streaming_not_supported");
    if (input.constraints.requiredQuantization && !node.capabilityProfile.quantizationSupport.includes(input.constraints.requiredQuantization)) reasons.push("quantization_not_supported");
    const vram = node.gpu[0]?.availableVramMiB;
    if (input.constraints.minVramMiB && vram?.state === "known" && vram.value < input.constraints.minVramMiB) reasons.push(`insufficient_vram:available=${vram.value},required=${input.constraints.minVramMiB}`);
    if (input.constraints.minVramMiB && (!vram || vram.state !== "known")) reasons.push("vram_unknown");

    // Queue starvation detection: reject nodes whose queue is already saturated
    if (node.health.queueState === "saturated") reasons.push("queue_saturated");

    if (reasons.length > 0) rejectedNodes.push({ nodeId: node.id, reasons });
    return reasons.length === 0;
  });

  if (candidates.length === 0) {
    throw new Error(`No placement candidates satisfy constraints. Rejections: ${JSON.stringify(rejectedNodes)}`);
  }

  const selected = candidates[0];
  const degradedPath = candidates.filter((n) => n.health.degradedState).map((n) => ({ nodeId: n.id, runtimeType: n.runtimeType, reason: "degraded_runtime_accepted", degraded: true }));
  const fallbackPath = candidates.slice(1).map((n) => ({ nodeId: n.id, runtimeType: n.runtimeType, reason: "deterministic_fallback_order", degraded: n.health.degradedState }));

  return {
    selectedRuntime: selected.runtimeType,
    selectedNode: selected.id,
    rationale: [
      `deterministic_selection=node_id_asc`,
      `workload=${input.workload}`,
      `policy=allowed:${input.policyDecision.trustScore.source}`,
    ],
    rejectedNodes,
    constraints: input.constraints,
    fallbackPath,
    degradedPath,
    policyReferences: input.policyDecision.reasons,
  };
}

export interface RuntimeCapabilityAdapter {
  runtimeType: RuntimeType;
  detect(): TelemetryValue<boolean>;
  capabilityProfile(): CapabilityProfile;
}

export class RuntimeCapabilityRegistry {
  constructor(private readonly adapters: RuntimeCapabilityAdapter[]) {}
  describeAll(): Array<{ runtimeType: RuntimeType; detected: TelemetryValue<boolean>; profile: CapabilityProfile }> {
    return this.adapters.map((adapter) => ({ runtimeType: adapter.runtimeType, detected: adapter.detect(), profile: adapter.capabilityProfile() }));
  }
}

export function defaultRuntimeCapabilityRegistry(): RuntimeCapabilityRegistry {
  const mk = (runtimeType: RuntimeType, profile: Omit<CapabilityProfile, "runtimeType">): RuntimeCapabilityAdapter => ({
    runtimeType,
    detect: () => ({ state: "unsupported", reason: "automatic_runtime_detection_not_configured" }),
    capabilityProfile: () => ({ runtimeType, ...profile }),
  });
  return new RuntimeCapabilityRegistry([
    mk("ollama", { supportedRuntimes: ["ollama"], inferenceEngine: "ollama", supportsEmbedding: true, supportsReasoning: true, supportsMultimodal: false, supportsStreaming: true, supportsToolCall: true, maxContextTokens: { state: "unknown" }, quantizationSupport: ["q4_0", "q8_0"] }),
    mk("llama.cpp", { supportedRuntimes: ["llama.cpp"], inferenceEngine: "llama.cpp", supportsEmbedding: true, supportsReasoning: true, supportsMultimodal: false, supportsStreaming: true, supportsToolCall: false, maxContextTokens: { state: "unknown" }, quantizationSupport: ["q4_k_m", "q5_k_m", "q8_0"] }),
    mk("vllm", { supportedRuntimes: ["vllm"], inferenceEngine: "vllm", supportsEmbedding: true, supportsReasoning: true, supportsMultimodal: true, supportsStreaming: true, supportsToolCall: true, maxContextTokens: { state: "unknown" }, quantizationSupport: [] }),
    mk("local", { supportedRuntimes: ["custom-local"], inferenceEngine: "adapter", supportsEmbedding: false, supportsReasoning: true, supportsMultimodal: false, supportsStreaming: false, supportsToolCall: false, maxContextTokens: { state: "unknown" }, quantizationSupport: [] }),
    mk("future", { supportedRuntimes: ["future"], inferenceEngine: "placeholder", supportsEmbedding: false, supportsReasoning: false, supportsMultimodal: false, supportsStreaming: false, supportsToolCall: false, maxContextTokens: { state: "unsupported", reason: "placeholder_adapter" }, quantizationSupport: [] }),
  ]);
}
