// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { evaluateReleaseGate, validateVerificationMatrixScripts } from "../src/lib/control-plane/r5-proofpack-release";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts?: Record<string, string> };
const matrixScripts = ["verify:governed-routing", "verify:release-readiness", "test:unit"];
const matrixCheck = validateVerificationMatrixScripts({ referencedScripts: matrixScripts, packageScripts: pkg.scripts ?? {} });
if (!matrixCheck.ok) {
  console.error(`Missing scripts: ${matrixCheck.missing.join(",")}`);
  process.exit(1);
}

const gaps = JSON.parse(process.env.NEMOCLAW_RELEASE_GAPS_JSON ?? '[{"id":"default-high-gap","severity":"high","resolved":true}]') as Array<{ id: string; severity: "low" | "medium" | "high"; resolved: boolean }>;
const waivers = JSON.parse(process.env.NEMOCLAW_RELEASE_WAIVERS_JSON ?? "[]") as Array<{ gapId: string; approvedBy: string }>;
const gate = evaluateReleaseGate(gaps, waivers);
if (!gate.pass) {
  console.error(`Release gate blocked: ${gate.blocked.join(",")}`);
  process.exit(1);
}

console.log("verify-release-gate: PASS");
