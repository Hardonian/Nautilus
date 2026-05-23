// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface RetrievalRequest { id: string; query: string; executionId?: string; }
export interface EvidenceReference { sourceId: string; uri?: string; }
export interface SourceTrustScore { sourceId: string; score: number; rationale: string; }
export interface RetrievalResult { requestId: string; evidence: EvidenceReference[]; trust: SourceTrustScore[]; degradedState?: string; }
export interface GraphHop { from: string; to: string; relation: string; hopIndex?: number; }
export interface RetrievalTrace { requestId: string; cache: "hit" | "miss"; hops: GraphHop[]; replayToken: string; failures?: string[]; }
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

export function rankRetrievalSources(scores: SourceTrustScore[]): SourceTrustScore[] {
  return [...scores].sort((a, b) => b.score - a.score || a.sourceId.localeCompare(b.sourceId));
}

export interface ArtifactDocument {
  id: string;
  path: string;
  content: string;
  metadata: Record<string, unknown>;
  lastUpdated: string;
}

export interface MediaArtifactDocument extends Omit<ArtifactDocument, "content"> {
  mimeType: string;
  blob: Buffer;
  transcription?: string;
  visionClasses?: string[];
}

export interface ArtifactIndex {
  indexArtifact(doc: ArtifactDocument): void;
  searchArtifacts(query: string, filter?: Record<string, unknown>): ArtifactDocument[];
}

export interface MemorySession {
  sessionId: string;
  agentId: string;
  history: { role: string; content: string }[];
  contextVectors: number[];
}

export interface CrossSessionMemory {
  storeSession(session: MemorySession): void;
  retrieveRelevantContext(agentId: string, currentContext: string): MemorySession[];
}

export class LocalArtifactIndex implements ArtifactIndex {
  private readonly docs = new Map<string, ArtifactDocument>();

  indexArtifact(doc: ArtifactDocument): void {
    this.docs.set(doc.id, doc);
  }

  searchArtifacts(query: string, filter?: Record<string, unknown>): ArtifactDocument[] {
    const results: ArtifactDocument[] = [];
    const lowerQuery = query.toLowerCase();
    for (const doc of this.docs.values()) {
      if (doc.content.toLowerCase().includes(lowerQuery) || doc.path.toLowerCase().includes(lowerQuery)) {
        if (filter) {
          let matches = true;
          for (const key in filter) {
            if (doc.metadata[key] !== filter[key]) {
              matches = false;
              break;
            }
          }
          if (!matches) continue;
        }
        results.push(doc);
      }
    }
    return results;
  }
}

export class MemorySessionStore implements CrossSessionMemory {
  private readonly sessions = new Map<string, MemorySession[]>();

  storeSession(session: MemorySession): void {
    const agentSessions = this.sessions.get(session.agentId) || [];
    agentSessions.push(session);
    this.sessions.set(session.agentId, agentSessions);
  }

  retrieveRelevantContext(agentId: string, currentContext: string): MemorySession[] {
    // Basic stub returning recent sessions
    const agentSessions = this.sessions.get(agentId) || [];
    return agentSessions.slice(-5);
  }
}
