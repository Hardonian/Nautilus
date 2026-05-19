// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SCHEMA_VERSION } from '../../contracts/nautilus/index.js';

export interface RequestConstraints {
  maxLatencyMs?: number;
  requiresGpu?: boolean;
  minMemoryGb?: number;
  allowedRegions?: string[];
}

export interface RequestEnvelope {
  kind: 'request';
  schemaVersion: typeof SCHEMA_VERSION;
  intent: string;
  constraints: RequestConstraints;
  traceId: string;
}

export function createRequest(intent: string, constraints: RequestConstraints, traceId: string): RequestEnvelope {
  return {
    kind: 'request',
    schemaVersion: SCHEMA_VERSION,
    intent,
    constraints,
    traceId,
  };
}
