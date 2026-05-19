// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  buildScenarioOutput,
  getScenario,
  scenarioDefinitions,
  type ScenarioName,
} from "./fixtures";

const arg = process.argv[2] as ScenarioName | undefined;
const name = arg ?? "golden-path";

try {
  const scenario = getScenario(name);
  process.stdout.write(`${JSON.stringify(buildScenarioOutput(scenario), null, 2)}\n`);
} catch (error) {
  process.stderr.write(
    `${JSON.stringify(
      {
        kind: "nautilus.mvp.error",
        ok: false,
        error: (error as Error).message,
        validScenarios: scenarioDefinitions.map((scenario) => scenario.name),
      },
      null,
      2,
    )}\n`,
  );
  process.exit(1);
}
