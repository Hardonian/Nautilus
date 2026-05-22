// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DeviceRegistry } from "./device-registry";
import type { PolicyEvaluationResult } from "./governance";
import type { TaskClassification } from "./task-classification";
import type { ControlDecisionReason, ControlRequestEnvelope, DegradedState, SchedulingCandidate, SchedulingDecision } from "./types";
import type { RejectedSchedulingCandidate, SchedulingCapabilityInputs } from "./types";

export interface SchedulingInput {
  request: ControlRequestEnvelope;
  classification: TaskClassification;
  registry: DeviceRegistry;
  policy: PolicyEvaluationResult;
  degradedStates: DegradedState[];
}

export interface FallbackPlanRecord {
  originalCandidate: string;
  fallbackCandidate: string;
  reason: string;
  policyStatus: string;
  degradedStatus: string;
  operatorExplanation: string;
}

export interface SchedulingResult {
  decision: SchedulingDecision;
  excludedByPolicy: string[];
  excludedByHealth: string[];
  fallbackPlan: FallbackPlanRecord[];
}

export function scheduleDeterministically(input: SchedulingInput): SchedulingResult {
  const excludedByPolicy: string[] = [];
  const excludedByHealth: string[] = [];
  const reasons: ControlDecisionReason[] = [];

  if (!input.policy.allowed) {
    reasons.push({ code: input.policy.reasonCode, explanation: "policy denied scheduling", source: input.policy.sourceRuleId });
    return { decision: { rejected: [], reasons }, excludedByPolicy: ["*"], excludedByHealth, fallbackPlan: [] };
  }

  const candidates: SchedulingCandidate[] = [];
  const rejected: RejectedSchedulingCandidate[] = [];
  const requestedInput = Number(input.request.metadata.estimatedInputTokens ?? "0");
  const requestedOutput = Number(input.request.metadata.estimatedOutputTokens ?? "0");
  const requiredVram = Number(input.request.metadata.vramRequiredMb ?? "0");
  for (const node of input.registry.listNodes()) {
    if (node.health !== "healthy") {
      excludedByHealth.push(node.nodeId);
      continue;
    }
    if (input.classification.remoteExecutionEligible === false && node.role === "remote") {
      excludedByPolicy.push(node.nodeId);
      continue;
    }

    const model = input.request.requestedModel
      ? node.capabilities.models.find((item) => item.modelId === input.request.requestedModel)
      : node.capabilities.models[0];
    const vramAvailable = node.capabilities.gpus.reduce((sum, gpu) => sum + gpu.vramMb * Math.max(1, gpu.count), 0);
    const contextWindow = model?.maxContextTokens ?? 0;
    const capabilityInputs: SchedulingCapabilityInputs = {
      vramAvailableMb: vramAvailable,
      vramRequiredMb: requiredVram,
      contextWindowTokens: contextWindow,
      estimatedInputTokens: requestedInput,
      estimatedOutputTokens: requestedOutput,
      recentLatencyMs: Number(node.metadata.recentLatencyMs ?? 99999),
      queueDepth: Number(node.metadata.queueDepth ?? 0),
      queuePressure: Number(node.metadata.queuePressure ?? 0),
      estimatedCost: Number(node.metadata.estimatedCost ?? 0),
      runtimeAvailable: node.health === "healthy",
      modelAvailable: Boolean(model),
      quantProfile: String(node.metadata.quantProfile ?? "unknown"),
      deviceClass: String(node.metadata.deviceClass ?? node.role),
    };
    const rejectionReasons: string[] = [];
    if (!model) rejectionReasons.push("model_unavailable");
    if (vramAvailable < requiredVram) rejectionReasons.push("insufficient_vram");
    if (contextWindow !== 0 && requestedInput + requestedOutput > contextWindow) rejectionReasons.push("context_overflow");
    if (!capabilityInputs.runtimeAvailable) rejectionReasons.push("runtime_unavailable");
    if (rejectionReasons.length > 0) {
      rejected.push({
        nodeId: node.nodeId,
        modelId: model?.modelId ?? input.request.requestedModel ?? "unknown",
        score: -1,
        reasons: [{ code: "candidate_rejected", explanation: rejectionReasons.join(","), source: "scheduler" }],
        rejectionReasons,
        capabilityInputs,
      });
      continue;
    }
    const score = Math.round(
      (node.role === "local" ? 100 : 50) +
        (model.flags.streaming === input.classification.requiresStreaming ? 10 : 0) +
        (capabilityInputs.vramAvailableMb - capabilityInputs.vramRequiredMb) / 1024 -
        capabilityInputs.queuePressure * 15 -
        capabilityInputs.recentLatencyMs / 100 -
        capabilityInputs.estimatedCost * 2,
    );
    candidates.push({ nodeId: node.nodeId, modelId: model.modelId, score, reasons: [{ code: "candidate_scored", explanation: `deterministic score=${score}`, source: "scheduler" }] });
  }

  candidates.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId) || a.modelId.localeCompare(b.modelId));

  if (!candidates.length) {
    reasons.push({ code: "no_candidate", explanation: "no eligible candidate after policy/health filtering", source: "scheduler" });
    return { decision: { rejected, reasons }, excludedByPolicy, excludedByHealth, fallbackPlan: [] };
  }

  const [selected, ...rest] = candidates;
  const fallbackPlan = rest.slice(0, 2).map((fallback) => ({
    originalCandidate: `${selected.nodeId}:${selected.modelId}`,
    fallbackCandidate: `${fallback.nodeId}:${fallback.modelId}`,
    reason: "primary_unavailable_or_declined",
    policyStatus: input.policy.reasonCode,
    degradedStatus: input.degradedStates[0]?.reasonCode ?? "none",
    operatorExplanation: `Fallback is planned only; execution remains explicit and operator-visible for ${fallback.nodeId}.`,
  }));

  reasons.push({ code: "scheduled", explanation: `selected ${selected.nodeId}/${selected.modelId}`, source: "scheduler" });
  return { decision: { selected, rejected: rejected.concat(rest.map((item) => ({ ...item, rejectionReasons: ["not_selected"], capabilityInputs: {
    vramAvailableMb: 0, vramRequiredMb: requiredVram, contextWindowTokens: 0, estimatedInputTokens: requestedInput, estimatedOutputTokens: requestedOutput, recentLatencyMs: 0, queueDepth: 0, queuePressure: 0, estimatedCost: 0, runtimeAvailable: true, modelAvailable: true, quantProfile: "unknown", deviceClass: "unknown",
  } }))), reasons }, excludedByPolicy, excludedByHealth, fallbackPlan };
}
