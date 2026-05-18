// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NautilusEventEnvelope } from "./nautilus-event-fabric";

export type RecallForgeCategory =
  | "execution_lineage"
  | "failure_fingerprint"
  | "remediation_outcome"
  | "operator_override"
  | "routing_outcome"
  | "prompt_effectiveness"
  | "retrieval_quality"
  | "topology_observation"
  | "policy_outcome";

export interface RecallForgeRecord {
  id: string;
  category: RecallForgeCategory;
  createdAt: string;
  provenanceEvent: Pick<NautilusEventEnvelope, "type" | "timestamp" | "source" | "executionId" | "correlationId">;
  data: Record<string, unknown>;
}

export interface RecallForgeWriter { write(record: RecallForgeRecord): void; }
export interface RecallForgeReader { query(category: RecallForgeCategory): RecallForgeRecord[]; }
export interface RecallForgeLineage { byExecution(executionId: string): RecallForgeRecord[]; }

export class InMemoryRecallForge implements RecallForgeWriter, RecallForgeReader, RecallForgeLineage {
  private readonly records: RecallForgeRecord[] = [];
  write(record: RecallForgeRecord): void {
    if (!record.provenanceEvent?.type) throw new Error("RecallForge provenanceEvent.type is required");
    if (!record.provenanceEvent?.timestamp) throw new Error("RecallForge provenanceEvent.timestamp is required");
    this.records.push(record);
  }
  query(category: RecallForgeCategory): RecallForgeRecord[] { return this.records.filter((r) => r.category === category); }
  byExecution(executionId: string): RecallForgeRecord[] { return this.records.filter((r) => r.provenanceEvent.executionId === executionId); }
}
