// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from "node:fs";

type Check = { name: string; pass: boolean; detail: string; severity: "hard" | "soft" };

const checks: Check[] = [];
const nodeMajor = Number(process.versions.node.split(".")[0] ?? "0");
checks.push({
  name: "node-version",
  pass: nodeMajor >= 22,
  detail: `Detected Node ${process.version}; require >=22.16.0`,
  severity: "hard",
});

const npmVersion = process.env.npm_config_user_agent ?? "unknown";
checks.push({
  name: "npm-presence",
  pass: npmVersion.includes("npm"),
  detail: `npm user-agent: ${npmVersion}`,
  severity: "hard",
});

for (const dir of ["scripts", "docs", "examples", "test/fixtures/nautilus"]) {
  checks.push({
    name: `required-dir:${dir}`,
    pass: existsSync(dir),
    detail: dir,
    severity: "hard",
  });
}
checks.push({
  name: "fixture-integrity",
  pass: existsSync("test/fixtures/nautilus/proofpack.json"),
  detail: "golden fixture present",
  severity: "hard",
});
checks.push({
  name: "example-integrity",
  pass: existsSync("examples/nautilus/golden-path/README.md"),
  detail: "example doc present",
  severity: "soft",
});
checks.push({
  name: "ci-prereq:github-workflows",
  pass: existsSync(".github/workflows/nautilus-package.yml"),
  detail: "workflow file exists",
  severity: "hard",
});

const envDoc = readFileSync("docs/operators/local-env.md", "utf8");
checks.push({
  name: "env-expectations",
  pass: envDoc.includes("unsupported"),
  detail: "operator env doc includes unsupported warnings",
  severity: "soft",
});

const hardFailures = checks.filter((c) => !c.pass && c.severity === "hard");
for (const c of checks) {
  const prefix = c.pass ? "PASS" : c.severity === "hard" ? "FAIL" : "DEGRADED";
  console.log(`${prefix} ${c.name}: ${c.detail}`);
}
if (hardFailures.length > 0) {
  process.exitCode = 1;
}
