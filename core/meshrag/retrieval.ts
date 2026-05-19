// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type RetrievalStatus = 'complete' | 'degraded' | 'timeout';

export interface RetrievalShardResult {
  shard: string;
  ok: boolean;
  timedOut?: boolean;
  evidenceIds: string[];
}

export function classifyRetrieval(results: RetrievalShardResult[]): { status: RetrievalStatus; evidenceIds: string[]; degradedShards: string[] } {
  const degradedShards = results.filter((result) => !result.ok).map((result) => result.shard);
  const evidenceIds = results.flatMap((result) => result.evidenceIds);
  if (results.some((result) => result.timedOut)) return { status: 'timeout', evidenceIds, degradedShards };
  if (degradedShards.length > 0) return { status: 'degraded', evidenceIds, degradedShards };
  return { status: 'complete', evidenceIds, degradedShards };
}
