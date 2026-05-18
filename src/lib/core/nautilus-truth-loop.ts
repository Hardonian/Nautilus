// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildNautilusEvent, type NautilusEventEmitter, type NautilusEventEnvelope } from "./nautilus-event-fabric";
import type { OperatorGraphTraceWriter } from "./operatorgraph";
import type { RecallForgeWriter } from "./recallforge";
import type { ApprovalGate, PolicyDecision, RiskSignal } from "./threatmesh";
import type { GraphAwareRetriever, RetrievalResult } from "./meshrag";

export type ExecutionId = string & { readonly __type: "execution_id" };

export interface RuntimeExecutor {
  run(input: { executionId: ExecutionId; correlationId: string }): Promise<Record<string, unknown>>;
}

export interface TruthLoopDependencies {
  eventBus: NautilusEventEmitter;
  traceWriter?: OperatorGraphTraceWriter;
  memoryStore?: RecallForgeWriter;
  policyGate?: ApprovalGate;
  retriever?: GraphAwareRetriever;
  runtime: RuntimeExecutor;
}

export interface TruthLoopReport {
  executionId: ExecutionId;
  correlationId: string;
  traceId?: string;
  startedEvent: NautilusEventEnvelope;
  completedEvent?: NautilusEventEnvelope;
  failedEvent?: NautilusEventEnvelope;
  policyDecisionRef?: string;
  retrievalRef?: string;
  retrievalState: "completed" | "unavailable";
  memoryRecorded: boolean;
  degraded: string[];
  status: "completed" | "failed" | "denied";
}

export function asExecutionId(value: string): ExecutionId {
  if (!value) throw new Error("executionId is required");
  return value as ExecutionId;
}

export async function runTruthLoop(
  deps: TruthLoopDependencies,
  input: { executionId: string; correlationId: string; action: string; riskSignals?: RiskSignal[]; query?: string },
): Promise<TruthLoopReport> {
  const executionId = asExecutionId(input.executionId);
  const degraded: string[] = [];

  const startedEvent = buildNautilusEvent({
    type: "execution.started",
    source: "runtime",
    executionId,
    correlationId: input.correlationId,
    status: "started",
    payload: { action: input.action },
  });
  deps.eventBus.emit(startedEvent);

  if (!deps.traceWriter) degraded.push("trace_store_unavailable");

  if (!deps.policyGate) {
    const deniedEvent = buildNautilusEvent({
      type: "policy.denied",
      source: "threatmesh",
      executionId,
      correlationId: input.correlationId,
      status: "denied",
      severity: "critical",
      payload: { reason: "policy_engine_unavailable", failClosed: true },
    });
    deps.eventBus.emit(deniedEvent);
    return {
      executionId,
      correlationId: input.correlationId,
      startedEvent,
      retrievalState: "unavailable",
      degraded: [...degraded, "policy_engine_unavailable"],
      memoryRecorded: false,
      status: "denied",
    };
  }

  const policyDecision = deps.policyGate.evaluate(input.action, input.riskSignals ?? []);
  const policyDecisionRef = `policy:${executionId}:${Date.now()}`;
  deps.eventBus.emit(
    buildNautilusEvent({
      type: "policy.evaluated",
      source: "threatmesh",
      executionId,
      correlationId: input.correlationId,
      status: policyDecision.allowed ? "completed" : "denied",
      payload: { policyDecisionRef, allowed: policyDecision.allowed, reasons: policyDecision.reasons },
    }),
  );

  if (!policyDecision.allowed) {
    return {
      executionId,
      correlationId: input.correlationId,
      startedEvent,
      policyDecisionRef,
      retrievalState: "unavailable",
      degraded,
      memoryRecorded: false,
      status: "denied",
    };
  }

  let retrievalState: TruthLoopReport["retrievalState"] = "unavailable";
  let retrievalRef: string | undefined;
  let retrievalResult: RetrievalResult | undefined;
  if (deps.retriever && input.query) {
    const result = deps.retriever.retrieve({ id: `${executionId}:retrieval`, query: input.query, executionId });
    retrievalResult = result.result;
    retrievalRef = result.trace.replayToken;
    retrievalState = "completed";
  } else {
    degraded.push("retrieval_engine_unavailable");
  }

  try {
    const runtimeResult = await deps.runtime.run({ executionId, correlationId: input.correlationId });
    const completedEvent = buildNautilusEvent({
      type: "execution.completed",
      source: "runtime",
      executionId,
      correlationId: input.correlationId,
      status: "completed",
      payload: { policyDecisionRef, retrievalRef, runtimeResult, retrievalResult },
    });
    deps.eventBus.emit(completedEvent);

    let memoryRecorded = false;
    if (deps.memoryStore) {
      deps.memoryStore.write({
        id: `${executionId}:completion`,
        category: "execution_lineage",
        createdAt: completedEvent.timestamp,
        provenanceEvent: {
          type: completedEvent.type,
          timestamp: completedEvent.timestamp,
          source: completedEvent.source,
          executionId,
          correlationId: input.correlationId,
        },
        data: completedEvent.payload,
      });
      memoryRecorded = true;
    } else {
      degraded.push("memory_store_unavailable");
    }

    return { executionId, correlationId: input.correlationId, startedEvent, completedEvent, policyDecisionRef, retrievalRef, retrievalState, degraded, memoryRecorded, traceId: input.correlationId, status: "completed" };
  } catch (error) {
    const failedEvent = buildNautilusEvent({
      type: "execution.failed",
      source: "runtime",
      executionId,
      correlationId: input.correlationId,
      status: "failed",
      severity: "error",
      payload: { reason: error instanceof Error ? error.message : String(error), policyDecisionRef, retrievalRef },
    });
    deps.eventBus.emit(failedEvent);
    return { executionId, correlationId: input.correlationId, startedEvent, failedEvent, policyDecisionRef, retrievalRef, retrievalState, degraded, memoryRecorded: false, traceId: input.correlationId, status: "failed" };
  }
}
