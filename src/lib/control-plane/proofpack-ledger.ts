// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Proofpack } from "../core/proofpacks.js";

export interface LedgerEntry {
  proofpackId: string;
  timestamp: string;
  previousHash: string;
  hash: string;
  payload: Proofpack;
}

function getLedgerDir(): string {
  const dir = join(homedir(), ".openclaw");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getLedgerPath(): string {
  return join(getLedgerDir(), "ledger.json");
}

export function computeProofpackHash(proofpack: Proofpack, previousHash: string): string {
  const data = JSON.stringify({ previousHash, payload: proofpack });
  return createHash("sha256").update(data).digest("hex");
}

export function loadLedger(): LedgerEntry[] {
  const path = getLedgerPath();
  if (!existsSync(path)) return [];
  try {
    const data = readFileSync(path, "utf-8");
    return JSON.parse(data) as LedgerEntry[];
  } catch {
    return [];
  }
}

export function appendToLedger(proofpack: Proofpack): LedgerEntry {
  const ledger = loadLedger();
  const previousHash = ledger.length > 0 ? ledger[ledger.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";

  const hash = computeProofpackHash(proofpack, previousHash);

  const entry: LedgerEntry = {
    proofpackId: proofpack.id,
    timestamp: new Date().toISOString(),
    previousHash,
    hash,
    payload: proofpack,
  };

  ledger.push(entry);
  writeFileSync(getLedgerPath(), JSON.stringify(ledger, null, 2));

  return entry;
}

export function verifyLedgerSignatureChains(ledger?: LedgerEntry[]): boolean {
  const entries = ledger ?? loadLedger();
  let expectedPreviousHash = "0000000000000000000000000000000000000000000000000000000000000000";

  for (const entry of entries) {
    if (entry.previousHash !== expectedPreviousHash) {
      return false;
    }
    const computedHash = computeProofpackHash(entry.payload, expectedPreviousHash);
    if (computedHash !== entry.hash) {
      return false;
    }
    expectedPreviousHash = computedHash;
  }

  return true;
}
