// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { generateKeyPairSync, sign, verify, KeyPairKeyObjectResult } from "node:crypto";

export interface SignedExport<T> {
  payload: T;
  signature: string;
  publicKey: string;
  algorithm: string;
  signedAt: string;
}

let sessionKey: KeyPairKeyObjectResult | undefined;

function getSessionKey(): KeyPairKeyObjectResult {
  if (!sessionKey) {
    sessionKey = generateKeyPairSync("ed25519");
  }
  return sessionKey;
}

/**
 * Deterministically serializes the payload for stable signing and hashing.
 */
function serializeForSigning(payload: unknown): string {
  // A naive deterministic stringify that sorts object keys
  const sortedStringify = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(sortedStringify);
    if (typeof obj === "object") {
      const keys = Object.keys(obj).sort();
      const result: Record<string, any> = {};
      for (const k of keys) {
        result[k] = sortedStringify(obj[k]);
      }
      return result;
    }
    return obj;
  };
  return JSON.stringify(sortedStringify(payload));
}

/**
 * Signs a payload using an ephemeral Ed25519 session key.
 */
export function signExport<T>(payload: T): SignedExport<T> {
  const keys = getSessionKey();
  const serialized = serializeForSigning(payload);
  const signatureBuffer = sign(null, Buffer.from(serialized, "utf-8"), keys.privateKey);
  
  return {
    payload,
    signature: signatureBuffer.toString("base64"),
    publicKey: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
    algorithm: "Ed25519",
    signedAt: new Date().toISOString(),
  };
}

/**
 * Verifies a signed export against its bundled public key.
 */
export function verifyExport<T>(signed: SignedExport<T>): boolean {
  try {
    const serialized = serializeForSigning(signed.payload);
    return verify(
      null,
      Buffer.from(serialized, "utf-8"),
      signed.publicKey,
      Buffer.from(signed.signature, "base64")
    );
  } catch {
    return false;
  }
}
