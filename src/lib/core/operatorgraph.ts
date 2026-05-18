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
export type ExecutionEdgeType = "dependency" | "retry" | "fallback" | "retrieval" | "policy_checkpoint" | "memory_checkpoint";
export interface ExecutionEdge { fromSpanId: string; toSpanId: string; type: ExecutionEdgeType; reason: string; }
export interface ReplaySnapshot { snapshotId: string; capturedAt: string; state: "ready" | "running" | "completed" | "failed" | "degraded"; notes?: string[]; }

export interface OperatorGraphReplayRecord { traceId: string; spans: OperatorGraphSpan[]; edges: ExecutionEdge[]; snapshots: ReplaySnapshot[]; unavailableReason?: string; }
export interface OperatorGraphTraceWriter {
  append(span: OperatorGraphSpan): void;
  addEdge(traceId: string, edge: ExecutionEdge): void;
  addSnapshot(traceId: string, snapshot: ReplaySnapshot): void;
}
export interface OperatorGraphTraceReader { get(traceId: string): OperatorGraphReplayRecord | null; }

export class InMemoryOperatorGraph implements OperatorGraphTraceWriter, OperatorGraphTraceReader {
  private readonly spans: OperatorGraphSpan[] = [];
  private readonly edges = new Map<string, ExecutionEdge[]>();
  private readonly snapshots = new Map<string, ReplaySnapshot[]>();
  append(span: OperatorGraphSpan): void { this.spans.push(span); }
  addEdge(traceId: string, edge: ExecutionEdge): void { this.edges.set(traceId, [...(this.edges.get(traceId) ?? []), edge]); }
  addSnapshot(traceId: string, snapshot: ReplaySnapshot): void { this.snapshots.set(traceId, [...(this.snapshots.get(traceId) ?? []), snapshot]); }
  get(traceId: string): OperatorGraphReplayRecord | null {
    const spans = this.spans.filter((s) => s.traceId === traceId);
    return spans.length ? { traceId, spans, edges: this.edges.get(traceId) ?? [], snapshots: this.snapshots.get(traceId) ?? [] } : null;
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
