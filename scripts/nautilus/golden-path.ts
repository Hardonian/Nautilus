// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildScenarioOutput, getScenario } from "./fixtures";
import { signExport } from "../../src/lib/security/export-signer";

process.stdout.write(
  `${JSON.stringify(signExport(buildScenarioOutput(getScenario("golden-path"))), null, 2)}\n`,
);
