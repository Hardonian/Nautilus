// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildProofpack } from "./nautilus/fixtures";

const complete = buildProofpack("complete");
const partial = buildProofpack("partial");
const checks = [
  { id: "complete_has_evidence", ok: complete.evidenceCount > 0 },
  { id: "complete_is_complete", ok: complete.completeness === "complete" },
  { id: "partial_is_degraded", ok: partial.completeness === "partial" && partial.degradedReasons.length > 0 },
];
const result = {
  kind: "nautilus.proofpack.verify",
  generatedAt: new Date().toISOString(),
  ok: checks.every((check) => check.ok),
  checks,
};

mkdirSync("artifacts", { recursive: true });
writeFileSync(join("artifacts", "verify-proofpack.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exit(1);
