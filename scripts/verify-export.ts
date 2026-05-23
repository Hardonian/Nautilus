// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildOperatorReport } from "./nautilus/fixtures";

const report = buildOperatorReport();
const checks = [
  { id: "package_ready", ok: report.packageReady === true },
  { id: "has_commands_array", ok: Array.isArray(report.commands) && report.commands.length > 0 },
  { id: "has_provenance", ok: typeof report.generatedAt === "string" && report.generatedAt.length > 0 },
];
const result = {
  kind: "nautilus.export.verify",
  generatedAt: new Date().toISOString(),
  ok: checks.every((check) => check.ok),
  checks,
};
mkdirSync("artifacts", { recursive: true });
writeFileSync(join("artifacts", "verify-export.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exit(1);
