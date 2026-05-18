// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface RiskSignal { id: string; severity: "low" | "medium" | "high" | "critical"; reason: string; }
export interface TrustScore { value: number; source: string; }
export interface ToolPermission { toolName: string; allow: boolean; reason: string; }
export interface PromptInspectionResult { allowed: boolean; findings: RiskSignal[]; }
export interface RuntimeContainmentState { mode: "normal" | "degraded" | "contained"; reason?: string; }
export interface PolicyDecision { action: string; allowed: boolean; reasons: string[]; trustScore: TrustScore; riskSignals: RiskSignal[]; }
export interface ApprovalGate { evaluate(action: string, riskSignals: RiskSignal[]): PolicyDecision; }

export class FailClosedApprovalGate implements ApprovalGate {
  evaluate(action: string, riskSignals: RiskSignal[]): PolicyDecision {
    const highRisk = riskSignals.some((r) => r.severity === "high" || r.severity === "critical");
    return {
      action,
      allowed: !highRisk,
      reasons: highRisk ? ["Fail-closed: high-risk action denied until explicit allow policy exists"] : ["No high-risk signals detected"],
      trustScore: { value: highRisk ? 0 : 70, source: "threatmesh-default" },
      riskSignals,
    };
  }
}
