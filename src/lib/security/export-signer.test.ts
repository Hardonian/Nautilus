// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { signExport, verifyExport } from './export-signer';

describe('Export Signer', () => {
  it('signs and verifies a payload correctly', () => {
    const payload = {
      executionId: 'exec-123',
      events: [{ id: 1, type: 'start' }, { id: 2, type: 'end' }]
    };

    const signed = signExport(payload);

    expect(signed.signature).toBeTruthy();
    expect(signed.publicKey).toBeTruthy();
    expect(signed.algorithm).toBe('Ed25519');

    const isValid = verifyExport(signed);
    expect(isValid).toBe(true);
  });

  it('rejects tampered payloads', () => {
    const payload = { test: true };
    const signed = signExport(payload);

    // Tamper payload
    signed.payload.test = false;

    const isValid = verifyExport(signed);
    expect(isValid).toBe(false);
  });

  it('rejects tampered signatures', () => {
    const payload = { test: true };
    const signed = signExport(payload);

    // Tamper one Base64 character deterministically (the original may not contain "A").
    const replacement = signed.signature[0] === 'A' ? 'B' : 'A';
    signed.signature = `${replacement}${signed.signature.slice(1)}`;

    const isValid = verifyExport(signed);
    expect(isValid).toBe(false);
  });
});
