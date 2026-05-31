// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";

const SCRYPT_PREFIX = "scrypt:";

export function hashCredential(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(normalized, salt, 64).toString("hex");
  return `${SCRYPT_PREFIX}${salt}:${hash}`;
}

export function verifyCredential(value: string | null | undefined, hashToVerify: string | null | undefined): boolean {
  const normalized = String(value ?? "").trim();
  if (!normalized) return !hashToVerify;
  if (!hashToVerify) return false;

  if (hashToVerify.startsWith(SCRYPT_PREFIX)) {
    const parts = hashToVerify.slice(SCRYPT_PREFIX.length).split(":");
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    try {
      const derivedKey = crypto.scryptSync(normalized, salt, 64);
      const expectedKey = Buffer.from(hash, "hex");
      if (derivedKey.length !== expectedKey.length) return false;
      return crypto.timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }

  // Legacy fallback (SHA-256 without salt)
  const legacyHash = crypto.createHash("sha256").update(normalized).digest("hex");
  return legacyHash === hashToVerify;
}
