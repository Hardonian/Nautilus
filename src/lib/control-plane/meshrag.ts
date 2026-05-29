// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { deterministicSerialize } from "./serde";

export type RetrievalDegradedReason =
  | "embedding_runtime_unavailable"
  | "embedding_adapter_unavailable"
  | "vector_store_unavailable"
  | "vector_store_degraded"
  | "cache_unavailable"
  | "graph_retrieval_unavailable";

export interface RetrievalEvidenceRef {
  sourceId: string;
  uri: string;
  excerpt?: string;
}

export interface RetrievalIngestionRecord {
  recordId: string;
  content: string;
  source: {
    sourceId: string;
    uri: string;
    trustScore: number;
    recordedAt: string;
    kind: "doc" | "event" | "policy" | "operator_note";
  };
  metadata?: Record<string, unknown>;
}

export interface EmbeddingAdapter {
  adapterId: string;
  status(): "available" | "unavailable";
  embed(input: { text: string }): Promise<{ vector: number[]; runtime: "native" | "local_fallback" }>;
}

export interface VectorStoreAdapter {
  adapterId: string;
  status(): "available" | "degraded" | "unavailable";
  upsert(records: Array<{ recordId: string; vector: number[]; record: RetrievalIngestionRecord }>): Promise<void>;
  query(input: { vector: number[]; topK: number }): Promise<Array<{ record: RetrievalIngestionRecord; distance: number }>>;
}

export interface SemanticCacheAdapter {
  get(key: string): { hit: boolean; value?: RetrievalResponse; trace: { key: string; state: "hit" | "miss" | "unavailable" } };
  set(key: string, value: RetrievalResponse): void;
}

export interface RetrievalRequest {
  requestId: string;
  query: string;
  topK: number;
  includeGraphHops?: boolean;
}

export interface RetrievalResult {
  recordId: string;
  sourceId: string;
  uri: string;
  content: string;
  score: number;
  trustScore: number;
  weightedScore: number;
  evidence: RetrievalEvidenceRef;
  graphHop: { status: "scaffolded_unavailable"; hopCount: 0 };
}

export interface RetrievalTrace {
  lineageId: string;
  replayHash: string;
  steps: string[];
  cache: { key: string; state: "hit" | "miss" | "unavailable" };
  degraded: RetrievalDegradedReason[];
  embeddingRuntime: "native" | "local_fallback" | "unavailable";
  embeddingAdapterState: "available" | "unavailable";
  vectorStoreState: "available" | "degraded" | "unavailable";
}

export interface RetrievalResponse {
  requestId: string;
  results: RetrievalResult[];
  unavailable: boolean;
  trace: RetrievalTrace;
  evidenceRefs: RetrievalEvidenceRef[];
}

export class LocalFallbackEmbeddingAdapter implements EmbeddingAdapter {
  adapterId = "local-fallback";
  status(): "available" { return "available"; }
  async embed(input: { text: string }): Promise<{ vector: number[]; runtime: "local_fallback" }> {
    const norm = input.text.trim().toLowerCase();
    return { vector: [norm.length, ...norm.slice(0, 7).split("").map((c) => c.charCodeAt(0) / 255)], runtime: "local_fallback" };
  }
}

export class InMemoryVectorStore implements VectorStoreAdapter {
  adapterId = "in-memory-vector";
  constructor(private readonly mode: "available" | "degraded" | "unavailable" = "available", private readonly rows: Array<{ recordId: string; vector: number[]; record: RetrievalIngestionRecord }> = []) {}
  status(): "available" | "degraded" | "unavailable" { return this.mode; }
  async upsert(records: Array<{ recordId: string; vector: number[]; record: RetrievalIngestionRecord }>): Promise<void> { this.rows.push(...records); }
  async query(input: { vector: number[]; topK: number }): Promise<Array<{ record: RetrievalIngestionRecord; distance: number }>> {
    return this.rows.map((r) => ({ record: r.record, distance: cosineDistance(input.vector, r.vector) })).sort((a, b) => a.distance - b.distance).slice(0, input.topK);
  }
}

export class InMemorySemanticCache implements SemanticCacheAdapter {
  private readonly map = new Map<string, RetrievalResponse>();
  constructor(private readonly available = true) {}
  get(key: string) {
    if (!this.available) return { hit: false, trace: { key, state: "unavailable" as const } };
    const value = this.map.get(key);
    return value ? { hit: true, value, trace: { key, state: "hit" as const } } : { hit: false, trace: { key, state: "miss" as const } };
  }
  set(key: string, value: RetrievalResponse): void { if (this.available) this.map.set(key, value); }
}

export async function ingestRecords(input: { records: RetrievalIngestionRecord[]; embedding: EmbeddingAdapter; vectorStore: VectorStoreAdapter }): Promise<{ accepted: string[]; degraded: RetrievalDegradedReason[] }> {
  const degraded: RetrievalDegradedReason[] = [];
  if (input.embedding.status() === "unavailable") return { accepted: [], degraded: ["embedding_adapter_unavailable"] };
  if (input.vectorStore.status() === "unavailable") return { accepted: [], degraded: ["vector_store_unavailable"] };
  if (input.vectorStore.status() === "degraded") degraded.push("vector_store_degraded");
  const rows = await Promise.all(
    input.records.map(async (record) => {
      const embedded = await input.embedding.embed({ text: record.content });
      return { recordId: record.recordId, vector: embedded.vector, record };
    })
  );
  await input.vectorStore.upsert(rows);
  return { accepted: rows.map((r) => r.recordId), degraded };
}

export async function retrieveWithLineage(input: { request: RetrievalRequest; embedding: EmbeddingAdapter; fallbackEmbedding: EmbeddingAdapter; vectorStore: VectorStoreAdapter; cache: SemanticCacheAdapter }): Promise<RetrievalResponse> {
  const degraded: RetrievalDegradedReason[] = [];
  const steps: string[] = ["request_received"];
  const cacheKey = `${input.request.query}|${input.request.topK}`;
  const cached = input.cache.get(cacheKey);
  if (cached.hit && cached.value) return cached.value;
  if (cached.trace.state === "unavailable") degraded.push("cache_unavailable");

  let embeddingRuntime: RetrievalTrace["embeddingRuntime"] = "unavailable";
  let vector: number[] = [];
  const embeddingAdapterState = input.embedding.status();
  if (embeddingAdapterState === "available") {
    const embedded = await input.embedding.embed({ text: input.request.query });
    vector = embedded.vector;
    embeddingRuntime = embedded.runtime;
    steps.push("query_embedded_native");
  } else {
    degraded.push("embedding_runtime_unavailable", "embedding_adapter_unavailable");
    const embedded = await input.fallbackEmbedding.embed({ text: input.request.query });
    vector = embedded.vector;
    embeddingRuntime = "local_fallback";
    steps.push("query_embedded_local_fallback");
  }

  const vectorStoreState = input.vectorStore.status();
  if (vectorStoreState === "unavailable") {
    degraded.push("vector_store_unavailable");
    return {
      requestId: input.request.requestId,
      results: [],
      unavailable: true,
      trace: buildTrace({ request: input.request, steps, cache: cached.trace, degraded, embeddingRuntime, embeddingAdapterState, vectorStoreState }),
      evidenceRefs: [],
    };
  }
  if (vectorStoreState === "degraded") degraded.push("vector_store_degraded");
  if (input.request.includeGraphHops) degraded.push("graph_retrieval_unavailable");

  const queried = await input.vectorStore.query({ vector, topK: input.request.topK });
  steps.push("vector_lookup_completed");
  const results = queried.map((q) => {
    const score = 1 - q.distance;
    const trustScore = clampTrust(q.record.source.trustScore);
    return {
      recordId: q.record.recordId,
      sourceId: q.record.source.sourceId,
      uri: q.record.source.uri,
      content: q.record.content,
      score,
      trustScore,
      weightedScore: score * trustScore,
      evidence: { sourceId: q.record.source.sourceId, uri: q.record.source.uri, excerpt: q.record.content.slice(0, 120) },
      graphHop: { status: "scaffolded_unavailable" as const, hopCount: 0 as const },
    };
  }).sort((a, b) => b.weightedScore - a.weightedScore);
  const response: RetrievalResponse = {
    requestId: input.request.requestId,
    unavailable: false,
    results,
    evidenceRefs: results.map((r) => r.evidence),
    trace: buildTrace({ request: input.request, steps, cache: cached.trace, degraded, embeddingRuntime, embeddingAdapterState, vectorStoreState }),
  };
  input.cache.set(cacheKey, response);
  return response;
}

function buildTrace(input: { request: RetrievalRequest; steps: string[]; cache: RetrievalTrace["cache"]; degraded: RetrievalDegradedReason[]; embeddingRuntime: RetrievalTrace["embeddingRuntime"]; embeddingAdapterState: RetrievalTrace["embeddingAdapterState"]; vectorStoreState: RetrievalTrace["vectorStoreState"] }): RetrievalTrace {
  const lineage = { requestId: input.request.requestId, query: input.request.query, topK: input.request.topK, steps: input.steps, degraded: input.degraded };
  return {
    lineageId: `retrieval-${Buffer.from(deterministicSerialize(lineage)).toString("base64url").slice(0, 24)}`,
    replayHash: Buffer.from(deterministicSerialize(lineage)).toString("base64url"),
    steps: input.steps,
    cache: input.cache,
    degraded: input.degraded,
    embeddingRuntime: input.embeddingRuntime,
    embeddingAdapterState: input.embeddingAdapterState,
    vectorStoreState: input.vectorStoreState,
  };
}

function cosineDistance(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
  const an = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const bn = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (an === 0 || bn === 0) return 1;
  return 1 - dot / (an * bn);
}

function clampTrust(score: number): number { return Math.max(0, Math.min(1, score)); }
