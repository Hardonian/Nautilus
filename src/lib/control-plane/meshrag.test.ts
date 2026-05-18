// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { InMemorySemanticCache, InMemoryVectorStore, LocalFallbackEmbeddingAdapter, ingestRecords, retrieveWithLineage, type EmbeddingAdapter } from "./meshrag";

class UnavailableEmbedding implements EmbeddingAdapter {
  adapterId = "native";
  status(): "unavailable" { return "unavailable"; }
  async embed(): Promise<{ vector: number[]; runtime: "native" }> { return { vector: [], runtime: "native" }; }
}

describe("meshrag retrieval contracts", () => {
  it("ingests and retrieves with evidence lineage and trust ranking", async () => {
    const embedding = new LocalFallbackEmbeddingAdapter();
    const vectorStore = new InMemoryVectorStore("available");
    await ingestRecords({
      records: [
        { recordId: "a", content: "policy allowlist details", source: { sourceId: "s1", uri: "file://policy", trustScore: 0.9, recordedAt: "2026-05-18T00:00:00.000Z", kind: "policy" } },
        { recordId: "b", content: "old note", source: { sourceId: "s2", uri: "file://note", trustScore: 0.2, recordedAt: "2026-05-18T00:00:00.000Z", kind: "operator_note" } },
      ],
      embedding,
      vectorStore,
    });
    const response = await retrieveWithLineage({ request: { requestId: "r1", query: "policy details", topK: 2, includeGraphHops: true }, embedding, fallbackEmbedding: embedding, vectorStore, cache: new InMemorySemanticCache() });
    expect(response.unavailable).toBe(false);
    expect(response.results[0].trustScore).toBeGreaterThanOrEqual(response.results[1].trustScore);
    expect(response.trace.degraded).toContain("graph_retrieval_unavailable");
    expect(response.trace.lineageId.startsWith("retrieval-")).toBe(true);
    expect(response.evidenceRefs.length).toBe(2);
  });

  it("surfaces explicit degraded states for unavailable embedding and vector store", async () => {
    const response = await retrieveWithLineage({
      request: { requestId: "r2", query: "anything", topK: 3 },
      embedding: new UnavailableEmbedding(),
      fallbackEmbedding: new LocalFallbackEmbeddingAdapter(),
      vectorStore: new InMemoryVectorStore("unavailable"),
      cache: new InMemorySemanticCache(false),
    });
    expect(response.unavailable).toBe(true);
    expect(response.trace.embeddingRuntime).toBe("local_fallback");
    expect(response.trace.degraded).toEqual(expect.arrayContaining(["embedding_adapter_unavailable", "embedding_runtime_unavailable", "vector_store_unavailable", "cache_unavailable"]));
  });

  it("returns deterministic cache contract hit/miss", async () => {
    const embedding = new LocalFallbackEmbeddingAdapter();
    const vectorStore = new InMemoryVectorStore("available");
    await ingestRecords({ records: [{ recordId: "c", content: "retrieval replay deterministic", source: { sourceId: "s3", uri: "file://replay", trustScore: 0.8, recordedAt: "2026-05-18T00:00:00.000Z", kind: "doc" } }], embedding, vectorStore });
    const cache = new InMemorySemanticCache();
    const first = await retrieveWithLineage({ request: { requestId: "r3", query: "replay", topK: 1 }, embedding, fallbackEmbedding: embedding, vectorStore, cache });
    const second = await retrieveWithLineage({ request: { requestId: "r3b", query: "replay", topK: 1 }, embedding, fallbackEmbedding: embedding, vectorStore, cache });
    expect(first.trace.cache.state).toBe("miss");
    expect(second.trace.cache.state).toBe("miss");
    expect(second.trace.replayHash).toBe(first.trace.replayHash);
  });
});
