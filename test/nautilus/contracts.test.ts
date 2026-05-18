// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { validateContract } from '../../contracts/nautilus/index';

describe('nautilus contracts', () => {
  it('validates execution contract', () => {
    const result = validateContract('execution', {
      kind: 'execution', schemaVersion: '1.0.0', state: 'queued', idempotencyKey: '12345678',
      identityScope: { actorIdentity: 'a', runtimeIdentity: 'r', nodeIdentity: 'n', executionOwner: 'o', namespace: 'ns', policyScope: 'p', memoryScope: 'm', proofpackScope: 'pp' },
    });
    expect(result.ok).toBe(true);
  });

  it('fails when execution scope missing', () => {
    const result = validateContract('execution', { kind: 'execution', schemaVersion: '1.0.0', state: 'queued', idempotencyKey: '12345678' });
    expect(result.ok).toBe(false);
  });
});
