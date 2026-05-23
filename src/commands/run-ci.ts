// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Command from "../lib/commands/run-ci";
import { withCommandDisplay } from "../lib/cli/command-display";

export default withCommandDisplay(Command, [
  {
    usage: "nemoclaw run-ci --action <action>",
    description: "Run headlessly for CI",
    group: "Sandbox Management",
    scope: "global",
    order: 10,
  },
]);
