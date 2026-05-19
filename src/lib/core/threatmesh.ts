// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface RiskSignal { id: string; severity: "low" | "medium" | "high" | "critical"; reason: string; }
export interface TrustScore { value: number; source: string; }
export interface ToolPermission { toolName: string; allow: boolean; reason: string; }
export interface PromptInspectionResult { allowed: boolean; findings: RiskSignal[]; }
export interface RuntimeContainmentState { mode: "normal" | "degraded" | "contained"; reason?: string; }
export interface PolicyDecision { action: string; allowed: boolean; reasons: string[]; trustScore: TrustScore; riskSignals: RiskSignal[]; policyLineage?: string[]; auditRef?: string; }
export interface ApprovalGate { evaluate(action: string, riskSignals: RiskSignal[], runtimeTrust?: number): PolicyDecision; }

export interface ExecutionGovernanceInput {
  action: string;
  workloadClass: string;
  runtimeTrustScore: number;
  runtimeIsolation: "trusted" | "restricted" | "isolated";
  restrictions?: string[];
  auditRef: string;
}

export class FailClosedApprovalGate implements ApprovalGate {
  evaluate(action: string, riskSignals: RiskSignal[], runtimeTrust = 100): PolicyDecision {
    const highRisk = riskSignals.some((r) => r.severity === "high" || r.severity === "critical");
    const denied = highRisk || runtimeTrust < 50;
    return {
      action,
      allowed: !denied,
      reasons: denied ? ["fail_closed_denied", ...(highRisk ? ["high_risk_signal"] : []), ...(runtimeTrust < 50 ? ["runtime_trust_low"] : [])] : ["allow_no_blockers"],
      trustScore: { value: denied ? 0 : 70, source: "threatmesh-default" },
      riskSignals,
      policyLineage: ["threatmesh/fail-closed/v1"],
      auditRef: `audit:${action}`,
    };
  }
}

export function evaluateExecutionGovernance(input: ExecutionGovernanceInput, gate: ApprovalGate, riskSignals: RiskSignal[]): PolicyDecision {
  if (input.runtimeIsolation === "isolated") {
    return {
      action: input.action,
      allowed: false,
      reasons: ["runtime_isolated", `workload_restricted:${input.workloadClass}`],
      trustScore: { value: 0, source: "threatmesh-governance" },
      riskSignals,
      policyLineage: ["threatmesh/runtime-isolation/v1"],
      auditRef: input.auditRef,
    };
  }
  const decision = gate.evaluate(input.action, riskSignals, input.runtimeTrustScore);
  if ((input.restrictions ?? []).includes(input.workloadClass)) {
    return { ...decision, allowed: false, reasons: [...decision.reasons, "workload_restriction_rule"], policyLineage: [...(decision.policyLineage ?? []), "threatmesh/workload-restrictions/v1"], auditRef: input.auditRef };
  }
  return { ...decision, auditRef: input.auditRef };
}
