// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NautilusEventEnvelope } from "./nautilus-event-fabric";

export interface OperatorGraphSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  executionStatus: "started" | "completed" | "failed" | "degraded";
  runtimeMetadata?: Record<string, unknown>;
  modelMetadata?: Record<string, unknown>;
  toolCallMetadata?: Record<string, unknown>;
  fallbackMarker?: string;
  policyDecisionRef?: string;
  retrievalRef?: string;
  startedAt: string;
  endedAt?: string;
  errorBoundary?: string;
}

export interface OperatorGraphReplayRecord { traceId: string; spans: OperatorGraphSpan[]; unavailableReason?: string; }
export interface OperatorGraphTraceWriter { append(span: OperatorGraphSpan): void; }
export interface OperatorGraphTraceReader { get(traceId: string): OperatorGraphReplayRecord | null; }

export class InMemoryOperatorGraph implements OperatorGraphTraceWriter, OperatorGraphTraceReader {
  private readonly spans: OperatorGraphSpan[] = [];
  append(span: OperatorGraphSpan): void { this.spans.push(span); }
  get(traceId: string): OperatorGraphReplayRecord | null {
    const spans = this.spans.filter((s) => s.traceId === traceId);
    return spans.length ? { traceId, spans } : null;
  }
}

export function eventToOperatorGraphSpan(event: NautilusEventEnvelope, traceId: string, spanId: string): OperatorGraphSpan {
  return {
    traceId,
    spanId,
    executionStatus: event.status === "failed" ? "failed" : event.status === "degraded" ? "degraded" : event.status === "completed" ? "completed" : "started",
    startedAt: event.timestamp,
    runtimeMetadata: { source: event.source, type: event.type },
  };
}
