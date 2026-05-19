// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const checks = [
  { name: "lint", command: "npm run lint" },
  { name: "typecheck", command: "npm run typecheck" },
  { name: "tests", command: "npm test" },
  { name: "build", command: "npm run build:cli" },
  { name: "smoke", command: "npm run nautilus:verify" },
  { name: "examples", command: "npm run nautilus:examples" },
];

const results = checks.map((check) => {
  try {
    execSync(check.command, { stdio: "pipe" });
    return { ...check, status: "pass" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ...check, status: "fail", error: message.split("\n")[0] };
  }
});

mkdirSync("artifacts", { recursive: true });
const summary = {
  generatedAt: new Date().toISOString(),
  commit: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
  overall: results.every((result) => result.status === "pass") ? "pass" : "degraded",
  checks: results,
};

writeFileSync(join("artifacts", "verification-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
