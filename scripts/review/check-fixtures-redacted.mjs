// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { execSync } from 'node:child_process';
import { fail, pass } from './common.mjs';

const allow = [
  'OPENSHELL-RESOLVE-ENV-',
  'xoxb-...',
  'xapp-...',
  'scripts/review/check-fixtures-redacted.mjs',
  'Slack\'s Bolt SDK validates token shape',
  'starting with xoxb- or xapp-',
];

const cmd = 'rg -n "(AKIA|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|xoxb-|ghp_)" src nemoclaw bin scripts --glob "!**/*.test.*"';
let lines = [];
try {
  const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  if (out) lines = out.split('\n');
} catch (error) {
  if (error.status !== 1) throw error;
}

const ignorePathHints = ['secret-scanner.ts','src/lib/security/','src/lib/sandbox-channels.ts','src/lib/onboard.ts'];
const suspicious = lines.filter((line) => {
  const normalized = line.replace(/\\/g, '/');
  return !ignorePathHints.some((p) => normalized.includes(p)) && !allow.some((token) => normalized.includes(token));
});
if (suspicious.length) fail(`Potential secret-like token found:\n${suspicious.slice(0, 5).join('\n')}`);
pass('No obvious secret-like tokens detected in non-test source paths.');
