// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { execa } from 'execa';

describe('nautilus golden path', () => {
  it('emits expected JSON shape and proofpack evidence', async () => {
    const { stdout } = await execa('npx', ['tsx', 'scripts/nautilus/golden-path.ts']);
    const payload = JSON.parse(stdout);
    expect(payload.evidence.executionId).toBeTruthy();
    expect(payload.evidence.idempotencyKey.length).toBeGreaterThanOrEqual(8);
    expect(payload.evidence.proofpack.status).toBeTruthy();
    expect(payload.evidence.events.length).toBeGreaterThan(0);
    expect(payload.generatedAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('emits deterministic degraded runtime output via runtime-health smoke', async () => {
    const { stdout } = await execa('npx', ['tsx', 'scripts/nautilus/runtime-health-smoke.ts']);
    const payload = JSON.parse(stdout);
    expect(payload.degraded).toBe(true);
    expect(payload.runtimeStatus).toBe('unavailable');
    expect(payload.generatedAt).toBe('2026-03-01T00:00:00.000Z');
  });
});
