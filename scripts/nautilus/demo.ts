// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildOperatorReport, buildProofpack, buildReplayReport, getScenario, buildScenarioOutput } from "./fixtures";

const scenario = buildScenarioOutput(getScenario("full-mvp-demo"));
const proofpack = buildProofpack("complete");
const replay = buildReplayReport();
const operatorReport = buildOperatorReport();

const payload = {
  kind: "nautilus.operator.demo.sample",
  fixture: true,
  deterministicSample: true,
  notice: scenario.notice,
  generatedAt: scenario.generatedAt,
  summary: {
    scenario: scenario.scenario,
    finalState: scenario.finalState,
    degraded: scenario.degraded,
    proofpackStatus: proofpack.status,
    replayMode: replay.replayMode,
    unsupportedClaims: scenario.unsupportedClaims,
  },
  scenario,
  proofpack,
  replay,
  operatorReport,
};

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
