// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type HandoffPhase = "classify" | "plan" | "retrieve" | "execute" | "verify" | "repair" | "summarize" | "route" | "finalize";
export type LatencyClass = "interactive" | "standard" | "batch" | "background";
export type ModelClassNeeded = "router" | "small" | "code" | "long_context" | "vision" | "verifier" | "embedding";
export type PrivacyClass = "local_only" | "external_allowed" | "redacted_external_allowed";
export type GpuPreference = "required" | "preferred" | "neutral" | "avoid" | "unavailable";

export interface TokenBudget {
  maxInputTokens: number; maxOutputTokens: number; reservedForSystem: number; reservedForEvidence: number; reservedForFinal: number;
  estimatedInput: number; estimatedOutput: number; budgetStatus: "ok" | "near_limit" | "compressed" | "refused" | "escalated_long_context";
}
export interface AgentHandoffState {
  schemaVersion: "1.0.0"; taskId: string; parentRunId?: string; currentRunId: string; tenantId?: string; phase: HandoffPhase;
  objective: string; constraints: string[]; acceptedFacts: string[]; rejectedFacts: string[]; openQuestions: string[]; decisionsMade: string[];
  toolEvidenceRefs: string[]; fileEvidenceRefs: string[]; commandEvidenceRefs: string[]; compactWorkingState: Record<string, unknown>;
  confidence: number; riskFlags: string[]; nextRecommendedAction?: string; tokenBudget: TokenBudget; latencyClass: LatencyClass;
  modelClassNeeded: ModelClassNeeded; gpuPreference: GpuPreference; privacyClass: PrivacyClass; maxRounds: number; currentRound: number;
  degradationReason?: string; createdAt: string; updatedAt: string;
}

export interface CompressionResult { compressedState: AgentHandoffState; originalBytes: number; compressedBytes: number; reductionRatio: number; droppedSections: string[]; }

const PHASES = new Set<HandoffPhase>(["classify","plan","retrieve","execute","verify","repair","summarize","route","finalize"]);
export function validateHandoff(state: AgentHandoffState): { ok: true } | { ok: false; reason: string } {
  if (!PHASES.has(state.phase)) return { ok: false, reason: "invalid_phase" };
  if (state.confidence < 0 || state.confidence > 1) return { ok: false, reason: "invalid_confidence" };
  if (state.currentRound > state.maxRounds) return { ok: false, reason: "round_exceeded" };
  if (state.privacyClass !== "local_only" && state.privacyClass !== "external_allowed" && state.privacyClass !== "redacted_external_allowed") return { ok: false, reason: "invalid_privacy" };
  return { ok: true };
}

export function compactHandoff(state: AgentHandoffState, maxBytes = 4000): CompressionResult {
  const raw = JSON.stringify(state);
  const originalBytes = Buffer.byteLength(raw, "utf8");
  if (originalBytes <= maxBytes) return { compressedState: state, originalBytes, compressedBytes: originalBytes, reductionRatio: 1, droppedSections: [] };
  const trimmed: AgentHandoffState = { ...state, acceptedFacts: state.acceptedFacts.slice(-8), rejectedFacts: state.rejectedFacts.slice(-8), openQuestions: state.openQuestions.slice(-8), decisionsMade: state.decisionsMade.slice(-8), compactWorkingState: { summary: "state_compacted_due_to_budget", keys: Object.keys(state.compactWorkingState).slice(0, 20) } };
  const compressedBytes = Buffer.byteLength(JSON.stringify(trimmed), "utf8");
  return { compressedState: trimmed, originalBytes, compressedBytes, reductionRatio: compressedBytes / originalBytes, droppedSections: ["history_trimmed", "working_state_summarized"] };
}

export type BackendName = "vllm" | "sglang" | "llama_cpp" | "ollama" | "openai" | "mock" | "unavailable";
export interface InferenceBackendCapabilities { backendName: BackendName; supportsStructuredOutput: boolean; supportsSpeculativeDecoding: boolean; supportsPrefixCache: boolean; supportsChunkedPrefill: boolean; supportsContinuousBatching: boolean; supportsKvCacheQuantization: boolean; supportsTurboQuant: boolean; supportsKivi: boolean; supportedQuantFormats: string[]; maxContextTokens: number; availableVramMb: number; externalApi: boolean; healthStatus: "healthy" | "degraded" | "unavailable"; degradedReason?: string; }

export function capabilityFromEnv(env: NodeJS.ProcessEnv): InferenceBackendCapabilities {
  const backend = (env.NAUTILUS_DEFAULT_BACKEND as BackendName) || "unavailable";
  if (backend === "unavailable") return { backendName: "unavailable", supportsStructuredOutput: false, supportsSpeculativeDecoding: false, supportsPrefixCache: false, supportsChunkedPrefill: false, supportsContinuousBatching: false, supportsKvCacheQuantization: false, supportsTurboQuant: false, supportsKivi: false, supportedQuantFormats: [], maxContextTokens: 0, availableVramMb: 0, externalApi: false, healthStatus: "unavailable", degradedReason: "backend_unconfigured" };
  const local = backend !== "openai";
  return { backendName: backend, supportsStructuredOutput: true, supportsSpeculativeDecoding: backend === "vllm" || backend === "sglang", supportsPrefixCache: backend === "vllm" || backend === "sglang", supportsChunkedPrefill: backend === "vllm" || backend === "sglang", supportsContinuousBatching: backend === "vllm" || backend === "sglang", supportsKvCacheQuantization: false, supportsTurboQuant: false, supportsKivi: false, supportedQuantFormats: backend === "llama_cpp" ? ["GGUF", "INT4"] : ["INT8"], maxContextTokens: Number(env.NAUTILUS_MAX_CONTEXT_TOKENS || 8192), availableVramMb: Number(env.NAUTILUS_AVAILABLE_VRAM_MB || 0), externalApi: !local, healthStatus: "healthy" };
}

export interface ModelRouteDecision { selectedBackend: BackendName; selectedModel: string; reason: string; rejectedReasons: string[]; degradationReason?: string; }
export function routeModel(input: { handoff: AgentHandoffState; capabilities: InferenceBackendCapabilities; estimatedInputTokens: number; retrievalSufficient: boolean; requireStructuredOutput?: boolean }): ModelRouteDecision {
  const rejectedReasons: string[] = [];
  if (input.handoff.privacyClass === "local_only" && input.capabilities.externalApi) return { selectedBackend: "unavailable", selectedModel: "none", reason: "privacy_fail_closed", rejectedReasons: ["external_blocked_by_policy"], degradationReason: "external_blocked_by_policy" };
  if (input.handoff.modelClassNeeded === "long_context" && input.retrievalSufficient) rejectedReasons.push("long_context_rejected_retrieval_sufficient");
  if (input.requireStructuredOutput && !input.capabilities.supportsStructuredOutput) return { selectedBackend: "unavailable", selectedModel: "none", reason: "structured_output_unsupported", rejectedReasons, degradationReason: "unsupported_capability" };
  if (input.capabilities.healthStatus !== "healthy") return { selectedBackend: "unavailable", selectedModel: "none", reason: "backend_unavailable", rejectedReasons, degradationReason: input.capabilities.degradedReason || "backend_unavailable" };
  const selectedModel = input.handoff.modelClassNeeded === "code" ? "code_reasoning" : input.handoff.modelClassNeeded === "long_context" && !input.retrievalSufficient ? "long_context" : "small";
  return { selectedBackend: input.capabilities.backendName, selectedModel, reason: "lowest_safe_cost", rejectedReasons };
}


export type CollaborationMode = "single_pass" | "recursive_compact" | "verifier_repair" | "degraded_single_model" | "no_model_deterministic";
export type TerminationReason =
  | "confidence_threshold_met"
  | "max_rounds_reached"
  | "max_wall_time_reached"
  | "token_budget_exhausted"
  | "verifier_passed"
  | "verifier_failed_no_repair_budget"
  | "backend_unavailable"
  | "degraded_policy_triggered";

export interface CollaborationRoundTelemetry {
  round: number;
  handoffBytes: number;
  compressed: boolean;
  terminationCandidate?: TerminationReason;
}

export interface RecursiveCollaborateInput {
  initial: AgentHandoffState;
  mode: CollaborationMode;
  maxRounds?: number;
  hardMaxRounds?: number;
  confidenceThreshold?: number;
  maxWallMs?: number;
  maxTokensIn?: number;
  verifierRequestsRepair?: boolean;
}

export interface RecursiveCollaborateResult {
  finalState: AgentHandoffState;
  roundsExecuted: number;
  terminationReason: TerminationReason;
  telemetry: CollaborationRoundTelemetry[];
}

export function recursiveCollaborate(input: RecursiveCollaborateInput): RecursiveCollaborateResult {
  const started = Date.now();
  const hardMax = Math.max(1, Math.min(input.hardMaxRounds ?? 3, 6));
  const maxRounds = Math.max(1, Math.min(input.maxRounds ?? input.initial.maxRounds, hardMax));
  const confidenceThreshold = input.confidenceThreshold ?? 0.85;
  const maxWallMs = input.maxWallMs ?? 5000;
  const maxTokensIn = input.maxTokensIn ?? input.initial.tokenBudget.maxInputTokens;

  if (input.mode === "degraded_single_model") {
    return { finalState: { ...input.initial, degradationReason: "degraded_single_model" }, roundsExecuted: 1, terminationReason: "degraded_policy_triggered", telemetry: [{ round: 1, handoffBytes: Buffer.byteLength(JSON.stringify(input.initial), "utf8"), compressed: false, terminationCandidate: "degraded_policy_triggered" }] };
  }
  if (input.mode === "no_model_deterministic") {
    return { finalState: input.initial, roundsExecuted: 1, terminationReason: "confidence_threshold_met", telemetry: [{ round: 1, handoffBytes: Buffer.byteLength(JSON.stringify(input.initial), "utf8"), compressed: false, terminationCandidate: "confidence_threshold_met" }] };
  }

  let state: AgentHandoffState = { ...input.initial };
  const telemetry: CollaborationRoundTelemetry[] = [];
  for (let round = 1; round <= maxRounds; round++) {
    if (Date.now() - started > maxWallMs) {
      return { finalState: state, roundsExecuted: round - 1, terminationReason: "max_wall_time_reached", telemetry };
    }

    const comp = compactHandoff({ ...state, currentRound: round });
    const estIn = state.tokenBudget.estimatedInput;
    telemetry.push({ round, handoffBytes: comp.compressedBytes, compressed: comp.originalBytes !== comp.compressedBytes });

    if (estIn > maxTokensIn) {
      return { finalState: { ...comp.compressedState, tokenBudget: { ...state.tokenBudget, budgetStatus: "refused" }, degradationReason: "token_budget_exhausted" }, roundsExecuted: round, terminationReason: "token_budget_exhausted", telemetry };
    }

    state = {
      ...comp.compressedState,
      currentRound: round,
      updatedAt: new Date().toISOString(),
      confidence: Math.min(1, comp.compressedState.confidence + 0.2),
      phase: round === maxRounds ? "finalize" : "verify",
    };

    if (input.mode === "verifier_repair" && round === 1 && input.verifierRequestsRepair) {
      state = { ...state, phase: "repair", decisionsMade: [...state.decisionsMade, "verifier_requested_repair"] };
      continue;
    }

    if (state.confidence >= confidenceThreshold) {
      return { finalState: state, roundsExecuted: round, terminationReason: input.mode === "verifier_repair" ? "verifier_passed" : "confidence_threshold_met", telemetry };
    }
  }

  const term: TerminationReason = input.mode === "verifier_repair" && input.verifierRequestsRepair ? "verifier_failed_no_repair_budget" : "max_rounds_reached";
  return { finalState: state, roundsExecuted: maxRounds, terminationReason: term, telemetry };
}
