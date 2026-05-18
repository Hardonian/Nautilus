// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NautilusEvent } from './contracts';

export type RetentionClass = 'hot' | 'warm' | 'cold' | 'immutable_evidence';
export interface EventEnvelope { key: string; event: NautilusEvent; retention: RetentionClass; archived?: boolean; schemaVersion: '1'; }

export class EventPipeline {
  private readonly q: EventEnvelope[] = [];
  private readonly dedupe = new Set<string>();
  public constructor(private readonly maxBuffered: number) {}

  push(envelope: EventEnvelope): { accepted: boolean; reason?: string } {
    if (this.dedupe.has(envelope.key)) return { accepted: false, reason: 'duplicate' };
    if (this.q.length >= this.maxBuffered) return { accepted: false, reason: 'buffer_overflow' };
    this.q.push(envelope);
    this.dedupe.add(envelope.key);
    this.q.sort((a, b) => a.event.at.localeCompare(b.event.at));
    return { accepted: true };
  }

  markArchived(key: string): boolean {
    const item = this.q.find((i) => i.key === key);
    if (!item) return false;
    item.archived = true;
    return true;
  }

  detectStale(nowIso: string, maxAgeMs: number): string[] {
    const now = Date.parse(nowIso);
    return this.q.filter((q) => now - Date.parse(q.event.at) > maxAgeMs).map((q) => q.key);
  }

  drain(): EventEnvelope[] { return this.q.splice(0, this.q.length); }
}
