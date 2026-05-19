// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { contractKinds, isSchemaVersionCompatible, validateContract } from '../../contracts/nautilus/index.ts';

const baseExecution = {
  kind: 'execution', schemaVersion: '1.0.0', state: 'queued', idempotencyKey: '12345678',
  identityScope: { actorIdentity: 'a', runtimeIdentity: 'r', nodeIdentity: 'n', executionOwner: 'o', namespace: 'ns', policyScope: 'p', memoryScope: 'm', proofpackScope: 'pp' },
};

describe('nautilus contracts', () => {
  it('supports all contract kinds', () => {
    const samples: Record<string, unknown> = {
      execution: baseExecution,
      runtime: { kind: 'runtime', schemaVersion: '1.0.0', runtimeStatus: 'available' },
      retrieval: { kind: 'retrieval', schemaVersion: '1.0.0', mode: 'historical' },
      policy: { kind: 'policy', schemaVersion: '1.0.0', decision: 'allow', policyScope: 'scope' },
      replay: { kind: 'replay', schemaVersion: '1.0.0', replayMode: 'read_only' },
      proofpack: { kind: 'proofpack', schemaVersion: '1.0.0', proofpackScope: 'scope' },
      event: { kind: 'event', schemaVersion: '1.0.0', eventType: 'x', timestampUtc: '2026-05-18T00:00:00.000Z' },
      memory: { kind: 'memory', schemaVersion: '1.0.0', memoryScope: 'scope', provenanceEventId: 'e1' },
    };
    for (const kind of contractKinds) expect(validateContract(kind, samples[kind]).ok).toBe(true);
  });

  it('enforces owner scope and idempotency', () => {
    expect(validateContract('execution', { ...baseExecution, identityScope: { ...baseExecution.identityScope, executionOwner: '' } }).ok).toBe(false);
    expect(validateContract('execution', { ...baseExecution, idempotencyKey: '' }).ok).toBe(false);
  });

  it('supports semantic compatibility checks', () => {
    expect(isSchemaVersionCompatible('1.2.0', '1.0.0')).toBe(true);
    expect(isSchemaVersionCompatible('1.0.0', '2.0.0')).toBe(false);
  });
});
