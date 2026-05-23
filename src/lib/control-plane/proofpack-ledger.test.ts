// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appendToLedger, loadLedger, verifyLedgerSignatureChains, computeProofpackHash } from "./proofpack-ledger";
import type { Proofpack } from "../core/proofpacks";
import * as fs from "node:fs";

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

vi.mock("node:os", () => ({
  homedir: () => "/fake/home",
}));

describe("Proofpack Ledger", () => {
  const mockProofpack1: Proofpack = {
    id: "exec-1:proofpack:2026-05-23T00:00:00Z",
    generatedAt: "2026-05-23T00:00:00Z",
    executionId: "exec-1",
    correlationId: "corr-1",
    eventLineage: [],
    policyLineage: [],
    retrievalLineage: [],
    traceLineage: [],
    memoryRefs: [],
    degradedStates: [],
    evidenceRefs: [],
  };

  const mockProofpack2: Proofpack = {
    ...mockProofpack1,
    id: "exec-2:proofpack:2026-05-23T00:01:00Z",
    executionId: "exec-2",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should append a proofpack to an empty ledger with zero-hash", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const entry = appendToLedger(mockProofpack1);

    expect(entry.previousHash).toBe("0000000000000000000000000000000000000000000000000000000000000000");
    expect(entry.proofpackId).toBe(mockProofpack1.id);
    expect(entry.hash).toBe(computeProofpackHash(mockProofpack1, entry.previousHash));

    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it("should append a proofpack to an existing ledger and chain hashes", () => {
    const zeroHash = "0000000000000000000000000000000000000000000000000000000000000000";
    const hash1 = computeProofpackHash(mockProofpack1, zeroHash);

    const existingLedger = [
      {
        proofpackId: mockProofpack1.id,
        timestamp: "2026-05-23T00:00:00Z",
        previousHash: zeroHash,
        hash: hash1,
        payload: mockProofpack1,
      }
    ];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingLedger));

    const entry2 = appendToLedger(mockProofpack2);

    expect(entry2.previousHash).toBe(hash1);
    expect(entry2.hash).toBe(computeProofpackHash(mockProofpack2, hash1));
  });

  it("should verify a valid signature chain", () => {
    const zeroHash = "0000000000000000000000000000000000000000000000000000000000000000";
    const hash1 = computeProofpackHash(mockProofpack1, zeroHash);
    const hash2 = computeProofpackHash(mockProofpack2, hash1);

    const validLedger = [
      {
        proofpackId: mockProofpack1.id,
        timestamp: "2026-05-23T00:00:00Z",
        previousHash: zeroHash,
        hash: hash1,
        payload: mockProofpack1,
      },
      {
        proofpackId: mockProofpack2.id,
        timestamp: "2026-05-23T00:01:00Z",
        previousHash: hash1,
        hash: hash2,
        payload: mockProofpack2,
      }
    ];

    expect(verifyLedgerSignatureChains(validLedger)).toBe(true);
  });

  it("should reject an invalid signature chain (tampered payload)", () => {
    const zeroHash = "0000000000000000000000000000000000000000000000000000000000000000";
    const hash1 = computeProofpackHash(mockProofpack1, zeroHash);

    const tamperedPayload = { ...mockProofpack1, executionId: "tampered-id" };

    const invalidLedger = [
      {
        proofpackId: mockProofpack1.id,
        timestamp: "2026-05-23T00:00:00Z",
        previousHash: zeroHash,
        hash: hash1,
        payload: tamperedPayload, // The hash was computed for mockProofpack1, not tamperedPayload
      }
    ];

    expect(verifyLedgerSignatureChains(invalidLedger)).toBe(false);
  });
});
