// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const { spawnSync } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const CHECK_TIMEOUT_MS = Number(process.env.NEMOCLAW_RELEASE_GATE_TIMEOUT_MS ?? 20 * 60 * 1000);

const checks = [
  { id: "changelog", label: "CHANGELOG hygiene", command: ["npm", "run", "verify:changelog-hygiene"] },
  { id: "typecheck", label: "TypeScript typecheck", command: ["npm", "run", "typecheck"] },
  { id: "lint", label: "Lint", command: ["npm", "run", "lint"] },
  { id: "unit", label: "Unit tests", command: ["npm", "run", "test:unit"] },
  { id: "integration", label: "Integration tests", command: ["npm", "run", "test:integration"] },
  { id: "chaos", label: "Degraded-state chaos", command: ["npm", "run", "verify:chaos"] },
  { id: "proofpack", label: "Proofpack validation", command: ["npm", "run", "verify:proofpack"] },
  { id: "replay", label: "Replay validation", command: ["npm", "run", "verify:replay"] },
  { id: "export", label: "Export validation", command: ["npm", "run", "verify:export"] },
  { id: "benchmarks", label: "Performance verification", command: ["npm", "run", "verify:benchmarks"] },
];

const startedAt = new Date();
const results = [];
let failures = 0;
console.log("verify-release-readiness");

for (const check of checks) {
  const [cmd, ...args] = check.command;
  const stepStart = Date.now();
  const result = spawnSync(cmd, args, { stdio: "inherit", timeout: CHECK_TIMEOUT_MS });
  const durationMs = Date.now() - stepStart;

  if (result.status === 0) {
    console.log(`PASS ${check.label}`);
    results.push({ ...check, status: "pass", durationMs });
    continue;
  }

  failures += 1;
  const timedOut = result.signal === "SIGTERM" && result.status === null;
  const failure = timedOut ? "timeout" : "exit_nonzero";
  console.log(`FAIL ${check.label} (${failure})`);
  results.push({ ...check, status: "fail", durationMs, failure, signal: result.signal ?? null, exitCode: result.status });
}

const summary = {
  kind: "release_readiness_gate",
  generatedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  timeoutMs: CHECK_TIMEOUT_MS,
  overall: failures > 0 ? "fail" : "pass",
  checks: results,
};
mkdirSync("artifacts", { recursive: true });
writeFileSync(join("artifacts", "release-readiness-gate.json"), `${JSON.stringify(summary, null, 2)}\n`);

if (failures > 0) {
  console.log(`Summary: PASS=${checks.length - failures} FAIL=${failures}`);
  process.exit(1);
}

console.log(`Summary: PASS=${checks.length} FAIL=0`);
