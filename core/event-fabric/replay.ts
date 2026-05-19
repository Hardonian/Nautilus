// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import type { NautilusEvent } from './contracts';

export type ReplayStatus = 'complete' | 'partial' | 'degraded';

export interface ReplayEvent extends NautilusEvent {
  sequence: number;
  evidenceHash?: string;
}

export interface ReplayResult {
  status: ReplayStatus;
  events: ReplayEvent[];
  gaps: number[];
  duplicates: string[];
  integrityHash: string;
  notes: string[];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function replayIntegrityHash(events: ReplayEvent[]): string {
  return createHash('sha256')
    .update(stableStringify(events.map((event) => ({ ...event, payload: event.payload }))))
    .digest('hex');
}

export function buildReplay(events: ReplayEvent[], expectedFinalSequence?: number): ReplayResult {
  const bySequence = new Map<number, ReplayEvent>();
  const duplicates: string[] = [];
  for (const event of events) {
    if (bySequence.has(event.sequence)) {
      duplicates.push(`${event.runId}:${event.sequence}`);
      continue;
    }
    bySequence.set(event.sequence, event);
  }

  const ordered = [...bySequence.values()].sort((a, b) => a.sequence - b.sequence);
  const lastSequence = expectedFinalSequence ?? ordered.at(-1)?.sequence ?? 0;
  const gaps: number[] = [];
  for (let sequence = 1; sequence <= lastSequence; sequence += 1) {
    if (!bySequence.has(sequence)) gaps.push(sequence);
  }

  const hasTerminal = ordered.some((event) =>
    ['execution.completed', 'execution.failed', 'runtime.degraded'].includes(event.type),
  );
  const notes: string[] = [];
  if (gaps.length > 0) notes.push('missing_event_segments_visible');
  if (duplicates.length > 0) notes.push('duplicate_event_segments_ignored');
  if (!hasTerminal && ordered.length > 0) notes.push('interrupted_trace_without_terminal_event');

  const status: ReplayStatus =
    gaps.length > 0 || !hasTerminal ? 'partial' : duplicates.length > 0 ? 'degraded' : 'complete';
  return { status, events: ordered, gaps, duplicates, integrityHash: replayIntegrityHash(ordered), notes };
}

export class ReplayHardenGuard {
  public static verifyReplay(result: ReplayResult): void {
    if (result.status === 'degraded' || result.status === 'partial') {
      throw new Error(`Replay failed integrity verification. Status: ${result.status}. Fails-closed for security.`);
    }
  }
}
