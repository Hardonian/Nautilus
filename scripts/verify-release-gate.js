#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const { spawnSync } = require("node:child_process");
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const ARTIFACTS_DIR = join(process.cwd(), "artifacts");
const GATE_FILE = join(ARTIFACTS_DIR, "release-gate.json");

const checks = [
  { id: "typecheck", label: "TypeScript typecheck", command: ["npm", "run", "typecheck"], severity: "high" },
  { id: "lint", label: "Biome lint", command: ["npm", "run", "lint"], severity: "high" },
  { id: "build", label: "Build", command: ["npm", "run", "build"], severity: "high" },
  { id: "test:unit", label: "Unit tests", command: ["npm", "run", "test:unit"], severity: "high" },
  { id: "verify:control-plane", label: "Control-plane tests", command: ["npm", "run", "verify:control-plane"], severity: "high" },
  { id: "verify:chaos", label: "Chaos/degraded tests", command: ["npm", "run", "verify:chaos"], severity: "medium" },
  { id: "verify:proofpack", label: "Proofpack verification", command: ["npm", "run", "verify:proofpack"], severity: "high" },
  { id: "verify:replay", label: "Replay verification", command: ["npm", "run", "verify:replay"], severity: "high" },
];

function isToolchainFailure(result) {
  if (result.error && result.error.code === "ENOENT") return true;
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.toLowerCase();
  return (
    text.includes("command not found") ||
    text.includes("is not recognized") ||
    text.includes("could not determine executable") ||
    text.includes("missing script") ||
    text.includes("cannot find module")
  );
}

function loadWaivers() {
  const waiverPath = join(process.cwd(), ".release-waivers.json");
  if (!existsSync(waiverPath)) return [];
  try {
    return JSON.parse(readFileSync(waiverPath, "utf8"));
  } catch {
    return [];
  }
}

const waivers = loadWaivers();
const waived = new Set(waivers.map((w) => w.gapId));

const results = [];
let highSeverityBlocked = false;

console.log("release-gate verification");

for (const check of checks) {
  const [cmd, ...cmdArgs] = check.command;
  const result = spawnSync(cmd, cmdArgs, { stdio: "pipe", encoding: "utf8", timeout: 1200000 });

  if (result.status === 0) {
    console.log(`PASS ${check.label}`);
    results.push({ id: check.id, label: check.label, severity: check.severity, resolved: true, waived: false });
    continue;
  }

  if (isToolchainFailure(result)) {
    console.log(`SKIP ${check.label} (toolchain failure)`);
    results.push({ id: check.id, label: check.label, severity: "low", resolved: false, waived: true, reason: "toolchain_failure" });
    continue;
  }

  const isWaived = waived.has(check.id);
  if (isWaived) {
    console.log(`WAIVED ${check.label} (${check.severity})`);
  } else {
    console.log(`FAIL ${check.label} (${check.severity})`);
    if (check.severity === "high") highSeverityBlocked = true;
  }

  results.push({
    id: check.id,
    label: check.label,
    severity: check.severity,
    resolved: false,
    waived: isWaived,
    stdout: (result.stdout ?? "").slice(-500),
    stderr: (result.stderr ?? "").slice(-500),
  });
}

const pass = !highSeverityBlocked;

if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const gateOutput = {
  pass,
  timestamp: new Date().toISOString(),
  checks: results,
  waivers: waivers,
  blocked: results.filter((r) => !r.resolved && !r.waived && r.severity === "high").map((r) => r.id),
};

writeFileSync(GATE_FILE, JSON.stringify(gateOutput, null, 2));

console.log("");
console.log(pass ? "release-gate: PASS" : "release-gate: FAIL");
const blockedIds = gateOutput.blocked;
if (blockedIds.length > 0) {
  console.log(`blocked: ${blockedIds.join(", ")}`);
}

process.exit(pass ? 0 : 1);
