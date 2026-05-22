// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const required = ["docs/gap-analysis.md", "docs/roadmap.md", "docs/verification-matrix.md"];
const checks = required.map((path) => ({ id: `exists:${path}`, ok: existsSync(path) }));
const result = {
  kind: "nautilus.docs-strict.verify",
  generatedAt: new Date().toISOString(),
  ok: checks.every((check) => check.ok),
  checks,
};
mkdirSync("artifacts", { recursive: true });
writeFileSync(join("artifacts", "verify-docs-strict.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exit(1);
