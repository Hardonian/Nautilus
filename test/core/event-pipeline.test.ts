// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { EventPipeline } from '../../core/event-fabric/pipeline';

const base = { runId: 'r1', pillar: 'runtime', severity: 'info', type: 'execution.started', payload: {} } as const;

describe('EventPipeline', () => {
  it('deduplicates and preserves ordering', () => {
    const p = new EventPipeline(4);
    p.push({ key: '2', event: { ...base, at: '2026-05-18T00:00:02.000Z' }, retention: 'hot', schemaVersion: '1' });
    p.push({ key: '1', event: { ...base, at: '2026-05-18T00:00:01.000Z' }, retention: 'warm', schemaVersion: '1' });
    const dup = p.push({ key: '1', event: { ...base, at: '2026-05-18T00:00:03.000Z' }, retention: 'warm', schemaVersion: '1' });
    expect(dup.accepted).toBe(false);
    expect(p.drain().map((e) => e.key)).toEqual(['1', '2']);
  });

  it('detects stale and marks archival', () => {
    const p = new EventPipeline(2);
    p.push({ key: 'a', event: { ...base, at: '2026-05-18T00:00:00.000Z' }, retention: 'immutable_evidence', schemaVersion: '1' });
    expect(p.markArchived('a')).toBe(true);
    expect(p.detectStale('2026-05-18T00:10:00.000Z', 1_000)).toEqual(['a']);
  });
});
