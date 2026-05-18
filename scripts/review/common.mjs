// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

export function trackedFiles() {
  return execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function read(path) {
  return readFileSync(path, 'utf8');
}

export function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

export function pass(message) {
  console.log(`PASS: ${message}`);
}

export function assertFile(path) {
  if (!existsSync(path)) fail(`Missing required file: ${path}`);
}
