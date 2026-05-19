// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildNautilusEvent, type NautilusEventEmitter } from "./nautilus-event-fabric";
import type { OperatorGraphTraceWriter } from "./operatorgraph";
import type { RecallForgeWriter } from "./recallforge";
import type { PolicyDecision, RiskSignal, ToolPermission, TrustScore } from "./threatmesh";

export type RuntimeRestriction = "local_only" | "no_network_egress" | "readonly_fs" | "operator_approval_required";
export interface RetrievalPermission { allow: boolean; reason: string; readonly: boolean; }
export interface PolicyPack {
  id: "local_dev_safe" | "operator_approval_required" | "retrieval_readonly" | "high_risk_fail_closed";
  description: string;
  restrictions: RuntimeRestriction[];
  toolPermissions: ToolPermission[];
  retrievalPermission: RetrievalPermission;
}

export interface ApprovalGate {
  required: boolean;
  approvedBy?: string;
  approvalRef?: string;
}

export interface PolicyEvaluationInput {
  executionId: string;
  correlationId: string;
  action: string;
  riskSignals: RiskSignal[];
  trustScore: TrustScore;
  toolName?: string;
  retrievalRequested?: boolean;
  packs: PolicyPack[];
  approval: ApprovalGate;
}

export const POLICY_PACKS: Record<PolicyPack["id"], PolicyPack> = {
  local_dev_safe: {
    id: "local_dev_safe",
    description: "Local developer profile with deterministic local-only restrictions.",
    restrictions: ["local_only", "no_network_egress"],
    toolPermissions: [],
    retrievalPermission: { allow: true, reason: "local_dev_safe_default", readonly: true },
  },
  operator_approval_required: {
    id: "operator_approval_required",
    description: "Requires explicit operator approval before high-impact actions.",
    restrictions: ["operator_approval_required"],
    toolPermissions: [],
    retrievalPermission: { allow: true, reason: "operator_approval_required", readonly: true },
  },
  retrieval_readonly: {
    id: "retrieval_readonly",
    description: "Retrieval is allowed read-only with lineage requirements.",
    restrictions: ["readonly_fs"],
    toolPermissions: [],
    retrievalPermission: { allow: true, reason: "retrieval_readonly", readonly: true },
  },
  high_risk_fail_closed: {
    id: "high_risk_fail_closed",
    description: "Critical and high risk signals deny execution unless an explicit allow policy exists.",
    restrictions: ["operator_approval_required"],
    toolPermissions: [],
    retrievalPermission: { allow: false, reason: "high_risk_fail_closed", readonly: true },
  },
};

export function evaluatePolicyPacks(input: PolicyEvaluationInput): PolicyDecision {
  const activePackIds = input.packs.map((p) => p.id);
  const highRisk = input.riskSignals.some((signal) => signal.severity === "high" || signal.severity === "critical");
  if (highRisk && activePackIds.length === 0) {
    return denyDecision(input, ["missing_policy_config_high_risk_fail_closed"], "threatmesh/policy-pack/missing");
  }
  if (activePackIds.includes("high_risk_fail_closed") && highRisk) {
    return denyDecision(input, ["high_risk_fail_closed"], "threatmesh/policy-pack/high-risk");
  }
  if (activePackIds.includes("operator_approval_required") && !input.approval.approvedBy) {
    return denyDecision(input, ["approval_required"], "threatmesh/policy-pack/approval");
  }
  if (input.toolName) {
    const deniedByToolRule = input.packs.some((pack) => pack.toolPermissions.some((permission) => permission.toolName === input.toolName && !permission.allow));
    if (deniedByToolRule) return denyDecision(input, ["tool_permission_denied"], "threatmesh/policy-pack/tool-permission");
  }
  if (input.retrievalRequested && input.packs.some((pack) => !pack.retrievalPermission.allow)) {
    return denyDecision(input, ["retrieval_permission_denied"], "threatmesh/policy-pack/retrieval-permission");
  }
  return {
    action: input.action,
    allowed: true,
    reasons: ["policy_pack_allow"],
    trustScore: input.trustScore,
    riskSignals: input.riskSignals,
    policyLineage: activePackIds.map((id) => `pack:${id}`),
    auditRef: `policy:${input.executionId}:${input.correlationId}`,
  };
}

function denyDecision(input: PolicyEvaluationInput, reasons: string[], lineage: string): PolicyDecision {
  return {
    action: input.action,
    allowed: false,
    reasons,
    trustScore: { value: 0, source: "threatmesh-policy-pack" },
    riskSignals: input.riskSignals,
    policyLineage: [lineage, ...input.packs.map((pack) => `pack:${pack.id}`)],
    auditRef: `policy:${input.executionId}:${input.correlationId}`,
  };
}

export function emitPolicyDecisionArtifacts(
  deps: { eventBus: NautilusEventEmitter; operatorGraph?: OperatorGraphTraceWriter; recallForge?: RecallForgeWriter },
  input: PolicyEvaluationInput,
  decision: PolicyDecision,
): void {
  const decisionRef = decision.auditRef ?? `policy:${input.executionId}:${input.correlationId}`;
  deps.eventBus.emit(
    buildNautilusEvent({
      type: decision.allowed ? "policy.evaluated" : "policy.denied",
      source: "threatmesh.policy-packs",
      executionId: input.executionId,
      correlationId: input.correlationId,
      status: decision.allowed ? "completed" : "denied",
      payload: { decisionRef, reasons: decision.reasons, lineage: decision.policyLineage, approvals: input.approval },
    }),
  );
  deps.operatorGraph?.append({
    traceId: input.correlationId,
    spanId: `${decisionRef}:policy`,
    executionStatus: decision.allowed ? "completed" : "failed",
    policyDecisionRef: decisionRef,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    runtimeMetadata: { action: input.action },
  });
  deps.recallForge?.write({
    id: `${decisionRef}:lineage`,
    category: "policy_outcome",
    createdAt: new Date().toISOString(),
    provenanceEvent: {
      type: decision.allowed ? "policy.evaluated" : "policy.denied",
      timestamp: new Date().toISOString(),
      source: "threatmesh.policy-packs",
      executionId: input.executionId,
      correlationId: input.correlationId,
    },
    data: { decisionRef, reasons: decision.reasons, policyLineage: decision.policyLineage, approvals: input.approval },
  });
}
