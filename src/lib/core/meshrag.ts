// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface RetrievalRequest { id: string; query: string; executionId?: string; }
export interface EvidenceReference { sourceId: string; uri?: string; }
export interface SourceTrustScore { sourceId: string; score: number; rationale: string; }
export interface RetrievalResult { requestId: string; evidence: EvidenceReference[]; trust: SourceTrustScore[]; }
export interface GraphHop { from: string; to: string; relation: string; }
export interface RetrievalTrace { requestId: string; cache: "hit" | "miss"; hops: GraphHop[]; replayToken: string; }
export interface CacheHit { key: string; value: RetrievalResult; }
export interface CacheMiss { key: string; reason: string; }

export interface SemanticCache { get(key: string): CacheHit | CacheMiss; put(key: string, value: RetrievalResult): void; }
export interface SourceTrustScorer { score(references: EvidenceReference[]): SourceTrustScore[]; }
export interface GraphAwareRetriever { retrieve(request: RetrievalRequest): { result: RetrievalResult; trace: RetrievalTrace }; }

export class InMemorySemanticCache implements SemanticCache {
  private readonly cache = new Map<string, RetrievalResult>();
  get(key: string): CacheHit | CacheMiss { const value = this.cache.get(key); return value ? { key, value } : { key, reason: "not_found" }; }
  put(key: string, value: RetrievalResult): void { this.cache.set(key, value); }
}
