// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildScenarioOutput,
  getScenario,
  scenarioDefinitions,
  type ScenarioName,
} from "./fixtures";

const requested = process.argv.slice(2) as ScenarioName[];
const selected = requested.length > 0 ? requested.map(getScenario) : scenarioDefinitions;
const failures: string[] = [];
for (const scenario of selected) {
  const dir = join(process.cwd(), "examples/nautilus", scenario.name);
  for (const file of ["README.md", "command.txt", "expected-output.json"]) {
    const target = join(dir, file);
    if (!existsSync(target)) failures.push(`${scenario.name}: missing ${file}`);
  }
  const expectedPath = join(dir, "expected-output.json");
  if (existsSync(expectedPath)) {
    const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
    const actual = buildScenarioOutput(scenario);
    if (JSON.stringify(expected) !== JSON.stringify(actual))
      failures.push(`${scenario.name}: expected-output.json is not in sync with fixture builder`);
  }
}
const result = {
  kind: "nautilus.examples.smoke",
  ok: failures.length === 0,
  checked: selected.map((scenario) => scenario.name),
  failures,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures.length > 0) process.exit(1);
