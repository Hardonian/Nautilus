// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { evaluateReleaseGate, validateVerificationMatrixScripts } from '../../src/lib/control-plane/r5-proofpack-release';

describe('Release gate', () => {
  it('fails when unresolved high severity gaps exist', () => {
    const gaps = [
      { id: 'typecheck', severity: 'high' as const, resolved: false },
    ];
    const result = evaluateReleaseGate(gaps, []);
    expect(result.pass).toBe(false);
    expect(result.blocked).toContain('typecheck');
  });

  it('passes when high severity gap is waived', () => {
    const gaps = [
      { id: 'typecheck', severity: 'high' as const, resolved: false },
    ];
    const waivers = [{ gapId: 'typecheck', approvedBy: 'operator' }];
    const result = evaluateReleaseGate(gaps, waivers);
    expect(result.pass).toBe(true);
    expect(result.blocked).toHaveLength(0);
  });

  it('passes when all gaps are resolved', () => {
    const gaps = [
      { id: 'typecheck', severity: 'high' as const, resolved: true },
      { id: 'lint', severity: 'high' as const, resolved: true },
    ];
    const result = evaluateReleaseGate(gaps, []);
    expect(result.pass).toBe(true);
    expect(result.blocked).toHaveLength(0);
  });

  it('passes when only low/medium severity gaps are unresolved', () => {
    const gaps = [
      { id: 'docs', severity: 'low' as const, resolved: false },
      { id: 'perf', severity: 'medium' as const, resolved: false },
    ];
    const result = evaluateReleaseGate(gaps, []);
    expect(result.pass).toBe(true);
    expect(result.blocked).toHaveLength(0);
  });

  it('fails nonexistent script reference in verification matrix', () => {
    const result = validateVerificationMatrixScripts({
      referencedScripts: ['scripts/verify-core.js', 'scripts/nonexistent-script.js'],
      packageScripts: { 'verify:core': 'node scripts/verify-core.js' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain('scripts/nonexistent-script.js');
    }
  });

  it('passes when all referenced scripts exist in package scripts', () => {
    const result = validateVerificationMatrixScripts({
      referencedScripts: ['verify:core', 'verify:release-gate'],
      packageScripts: { 'verify:core': 'node scripts/verify-core.js', 'verify:release-gate': 'node scripts/verify-release-gate.js' },
    });
    expect(result.ok).toBe(true);
  });
});
