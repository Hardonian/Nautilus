// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import {
  buildOperatorReport,
  buildProofpack,
  buildReplayReport,
  buildRuntimeHealthDegraded,
  buildScenarioOutput,
  scenarioDefinitions,
} from "./fixtures";

const requiredOutputs = [
  "examples/nautilus/outputs/proofpack.complete.json",
  "examples/nautilus/outputs/proofpack.partial.json",
  "examples/nautilus/outputs/replay.report.json",
  "examples/nautilus/outputs/operator.report.json",
  "examples/nautilus/outputs/runtime.health.degraded.json",
];
const checks = [
  { name: "scenario-count", ok: scenarioDefinitions.length === 10 },
  {
    name: "examples-present",
    ok: scenarioDefinitions.every((scenario) =>
      existsSync(`examples/nautilus/${scenario.name}/README.md`),
    ),
  },
  { name: "sample-outputs-present", ok: requiredOutputs.every((file) => existsSync(file)) },
  {
    name: "golden-path-completes",
    ok: buildScenarioOutput(scenarioDefinitions[0]).finalState === "completed",
  },
  { name: "partial-proofpack-degraded", ok: buildProofpack("partial").completeness === "partial" },
  { name: "replay-read-only", ok: buildReplayReport().replayMode === "read_only" },
  { name: "runtime-health-degraded", ok: buildRuntimeHealthDegraded().degraded === true },
  { name: "operator-report-ready", ok: buildOperatorReport().packageReady === true },
];
const result = {
  kind: "nautilus.package.verify",
  ok: checks.every((check) => check.ok),
  checks,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exit(1);
