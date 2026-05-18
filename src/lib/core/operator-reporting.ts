// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ExecutionPlan } from "./runtime-intelligence";
import type { RetrievalResult } from "./meshrag";
import type { PolicyDecision } from "./threatmesh";

export interface OperatorExecutionSummary {
  executionId: string;
  runtimePlacement: { nodeId: string; runtime: string };
  retrievalSources: string[];
  policyEvaluations: string[];
  fallbackUsage: string[];
  degradedStates: string[];
  memoryRecordsCreated: string[];
  traceReferences: string[];
  errors: string[];
  warnings: string[];
  finalOutcome: "success" | "failed" | "degraded";
}

export function buildOperatorExecutionSummary(input: {
  executionId: string;
  plan: ExecutionPlan;
  retrieval: RetrievalResult;
  policy: PolicyDecision;
  memoryRecordIds: string[];
  traceRefs: string[];
  errors?: string[];
}): OperatorExecutionSummary {
  const warnings = input.retrieval.degradedState ? [`retrieval_degraded:${input.retrieval.degradedState}`] : [];
  return {
    executionId: input.executionId,
    runtimePlacement: { nodeId: input.plan.selectedNode, runtime: input.plan.selectedRuntime },
    retrievalSources: input.retrieval.evidence.map((e) => e.sourceId),
    policyEvaluations: input.policy.reasons,
    fallbackUsage: input.plan.fallbackPath.map((p) => `${p.nodeId}:${p.reason}`),
    degradedStates: [...input.plan.degradedPath.map((d) => `${d.nodeId}:${d.reason}`), ...warnings],
    memoryRecordsCreated: input.memoryRecordIds,
    traceReferences: input.traceRefs,
    errors: input.errors ?? [],
    warnings,
    finalOutcome: input.errors?.length ? "failed" : warnings.length || input.plan.degradedPath.length ? "degraded" : "success",
  };
}
