// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Shell-quote a value for safe interpolation into bash -c strings.
 * Wraps in single quotes and escapes embedded single quotes.
 */
export function shellQuote(value: string): string {
  if (!value) return "''";
  if (/^[a-zA-Z0-9_.-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}
