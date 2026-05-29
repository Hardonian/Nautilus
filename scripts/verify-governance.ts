// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const checks = [
  "npm run verify:status-truth",
  "npm run verify:threat-seams",
  "npm run verify:version-drift",
];

const results: Array<{ command: string; status: "pass" | "fail"; exitCode: number | null }> = [];
for (const command of checks) {
  const run = spawnSync(command, { stdio: "inherit", shell: true });
  results.push({ command, status: run.status === 0 ? "pass" : "fail", exitCode: run.status });
  if (run.status !== 0) break;
}

const overall = results.every((r) => r.status === "pass") ? "pass" : "degraded";
const scoreboard = {
  generatedAt: new Date().toISOString(),
  overall,
  categories: {
    contractBoundaryIntegrity:
      results.find((r) => r.command.includes("status-truth"))?.status ?? "unknown",
    threatSeamStatus: results.find((r) => r.command.includes("threat-seams"))?.status ?? "unknown",
    versionDriftStatus:
      results.find((r) => r.command.includes("version-drift"))?.status ?? "unknown",
  },
  verification: results,
};
mkdirSync("artifacts/governance", { recursive: true });
writeFileSync(
  "artifacts/governance/governance-scoreboard.json",
  JSON.stringify(scoreboard, null, 2) + "\n",
);
const md = `# Governance Scoreboard\n\n- Overall: **${overall}**\n\n## Verification Commands\n${results.map((r) => `- ${r.status.toUpperCase()}: \`${r.command}\``).join("\n")}\n`;
writeFileSync("artifacts/governance/governance-scoreboard.md", md);

if (overall !== "pass") process.exit(1);
console.log("verify:governance PASS");
