// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * High-confidence secret scanner for persistent workspace memory writes.
 *
 * Detects likely API keys, tokens, certificates, and credentials in free-text
 * content (markdown, plain text). Tuned for high confidence — patterns are
 * anchored to known prefixes/formats to keep false positives low.
 *
 * Ref: https://github.com/NVIDIA/NemoClaw/issues/1233
 */

export interface SecretMatch {
  pattern: string;
  redacted: string;
}

interface SecretPattern {
  name: string;
  regex: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // NVIDIA
  { name: "NVIDIA API key", regex: /\bnvapi-[A-Za-z0-9_-]{20,}\b/ },

  // OpenAI — exclude sk-ant- (Anthropic) to avoid double-matching
  { name: "OpenAI API key", regex: /\bsk-(?!ant-)[A-Za-z0-9]{20,}\b/ },

  // GitHub
  { name: "GitHub token", regex: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9]{36,}\b/ },

  // AWS
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "AWS secret key",
    regex: /(?<=aws_secret_access_key\s*[=:]\s*)[A-Za-z0-9/+=]{40}\b/i,
  },

  // Slack
  { name: "Slack token", regex: /\bxox[bpas]-[A-Za-z0-9-]{10,}\b/ },

  // Discord — require contextual prefix to avoid matching JWT/base64 strings
  {
    name: "Discord bot token",
    regex:
      /(?<=(?:discord|bot|DISCORD_TOKEN|BOT_TOKEN|token)\s*[=:]\s*["']?)[A-Za-z0-9]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/,
  },

  // npm
  { name: "npm token", regex: /\bnpm_[A-Za-z0-9]{36,}\b/ },

  // Private keys (PEM)
  {
    name: "Private key",
    regex: /-----BEGIN\s+(RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  },

  // Generic bearer/auth header values (Authorization: Bearer <token>)
  {
    name: "Authorization header",
    regex: /(?<=(?:Authorization\s*:\s*Bearer|Bearer\s*[=:])\s*["']?)[A-Za-z0-9._~+/=-]{40,}/i,
  },

  // Telegram bot token
  { name: "Telegram bot token", regex: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/ },

  // Google API key
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },

  // Anthropic API key
  { name: "Anthropic API key", regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },

  // HuggingFace token
  { name: "HuggingFace token", regex: /\bhf_[A-Za-z0-9]{20,}\b/ },

  // Base64-encoded JWTs
  { name: "JSON Web Token (JWT)", regex: /\bey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },

  // URL-embedded credentials
  { name: "URL-embedded credentials", regex: /(?:https?|ftp|postgres|mysql|redis|mongodb):\/\/[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+@/i },
];

/**
 * Scan text content for high-confidence secret patterns.
 * Returns an array of matches with the pattern name and a redacted snippet.
 */
export function scanForSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const seenValues = new Set<string>();

  for (const { name, regex } of SECRET_PATTERNS) {
    const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
    for (const match of content.matchAll(new RegExp(regex.source, flags))) {
      const value = match[0];
      if (seenValues.has(value)) continue;
      seenValues.add(value);
      const redacted = value.length > 8 ? `${value.slice(0, 4)}..${value.slice(-4)}` : "****";
      matches.push({ pattern: name, redacted });
    }
  }

  // Scan for high-entropy strings (Base64/Hex like credentials)
  const genericSecretRegex = /\b[A-Za-z0-9+/=_-]{20,}\b/g;
  for (const match of content.matchAll(genericSecretRegex)) {
    const value = match[0];
    if (seenValues.has(value)) continue;
    if (calculateEntropy(value) > 4.5) {
      if ([...seenValues].some((v) => v.includes(value) || value.includes(v))) continue;
      seenValues.add(value);
      const redacted = `${value.slice(0, 4)}..${value.slice(-4)}`;
      matches.push({ pattern: "High-entropy credential", redacted });
    }
  }

  return matches;
}

function calculateEntropy(str: string): number {
  if (str.length === 0) return 0;
  const counts: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    counts[char] = (counts[char] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Memory paths that the scanner should protect. A Write tool call targeting
 * any path containing these segments is considered a memory write.
 */
// Known bypass vectors: split secrets across multiple writes.
// High-entropy strings are caught via the Shannon entropy fallback calculation.
const MEMORY_PATH_SEGMENTS = [
  "/.openclaw/memory/",
  "/.openclaw/workspace/",
  "/.openclaw/agents/",
  "/.openclaw/skills/",
  "/.openclaw/hooks/",
  "/.openclaw/credentials/",
  "/.openclaw/canvas/",
  "/.openclaw/identity/",
  "/.openclaw/cron/",
  "/.openclaw/telegram/",
  "/.openclaw/sandbox/",
  "/.openclaw/MEMORY.md",
  "/.openclaw/openclaw.json",
  "/.nemoclaw/",
];

/**
 * Returns true if the given file path targets a persistent memory location.
 */
export function isMemoryPath(filePath: string): boolean {
  return MEMORY_PATH_SEGMENTS.some((segment) => filePath.includes(segment));
}
