// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';

export type MetricTruth = 'observed' | 'derived' | 'scaffolded' | 'unavailable';

export interface MetricSample {
  name: string;
  value?: number;
  source?: 'runtime' | 'replay' | 'operator';
  derivedFrom?: string[];
}

export function classifyMetricTruth(sample: MetricSample): MetricTruth {
  if (typeof sample.value !== 'number') return 'unavailable';
  if (sample.source === 'runtime' || sample.source === 'operator') return 'observed';
  if (sample.source === 'replay' && sample.derivedFrom && sample.derivedFrom.length > 0) return 'derived';
  return 'scaffolded';
}

export function hashMetricSnapshot(samples: MetricSample[]): string {
  const payload = samples
    .map(s => `${s.name}:${s.value ?? 'null'}:${s.source ?? 'none'}`)
    .sort()
    .join('|');
  return createHash('sha256').update(payload).digest('hex');
}
