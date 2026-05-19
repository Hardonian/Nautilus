// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildScenarioOutput, getScenario } from "./fixtures";

process.stdout.write(
  `${JSON.stringify(buildScenarioOutput(getScenario("golden-path")), null, 2)}\n`,
);
