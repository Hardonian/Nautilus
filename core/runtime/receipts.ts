// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SCHEMA_VERSION } from '../../contracts/nautilus/index.js';

export type DecisionType = 'granted' | 'denied' | 'degraded';

export interface ExecutionReceipt {
  kind: 'receipt';
  schemaVersion: typeof SCHEMA_VERSION;
  decision: DecisionType;
  evidence: string;
  requestId: string;
  issuedAtUtc: string;
}

export function issueReceipt(decision: DecisionType, evidence: string, requestId: string): ExecutionReceipt {
  return {
    kind: 'receipt',
    schemaVersion: SCHEMA_VERSION,
    decision,
    evidence,
    requestId,
    issuedAtUtc: new Date().toISOString(),
  };
}
