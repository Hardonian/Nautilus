// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { execa } from 'execa';

describe('nautilus golden path', () => {
  it('emits expected JSON shape and proofpack evidence', async () => {
    const { stdout } = await execa('npx', ['tsx', 'scripts/nautilus/golden-path.ts']);
    const payload = JSON.parse(stdout);
    expect(payload.executionId).toBeTruthy();
    expect(payload.idempotencyKey.length).toBeGreaterThanOrEqual(8);
    expect(payload.evidence.proofpack.status).toBeTruthy();
    expect(payload.evidence.events.length).toBeGreaterThan(0);
  });

  it('supports degraded runtime path', async () => {
    const { stdout } = await execa('npx', ['tsx', 'scripts/nautilus/golden-path.ts', JSON.stringify({ runtimeAvailable: false })]);
    const payload = JSON.parse(stdout);
    expect(payload.degraded).toBe(true);
    expect(['failed', 'degraded']).toContain(payload.finalState);
  });
});
