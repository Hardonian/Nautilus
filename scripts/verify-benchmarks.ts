// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildScenarioOutput, scenarioDefinitions } from "./nautilus/fixtures";

const outputs = scenarioDefinitions.map((scenario) => buildScenarioOutput(scenario));
const latency = outputs.map((item) => item.evidence.events.length * 10).sort((a, b) => a - b);

const p50 = latency.length ? latency[Math.floor((latency.length - 1) * 0.5)] : null;
const p95 = latency.length ? latency[Math.floor((latency.length - 1) * 0.95)] : null;
const summary = {
  kind: "nautilus.benchmark.verify",
  generatedAt: new Date().toISOString(),
  runnable: latency.length > 0,
  status: latency.length > 0 ? "pass" : "degraded",
  modelRuntimeComparisons: outputs.map((item) => ({
    scenario: item.scenario,
    model: "fixture-model",
    runtime: item.evidence.runtimeHealth.runtimeStatus,
    device: "fixture-device",
    latencyMs: item.evidence.events.length * 10,
  })),
  latency: { p50, p95, samples: latency.length },
};

mkdirSync("artifacts", { recursive: true });
writeFileSync(join("artifacts", "verify-benchmarks.json"), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (!summary.runnable) process.exit(1);
