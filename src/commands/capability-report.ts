// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Command from "../lib/commands/capability-report";
import { withCommandDisplay } from "../lib/cli/command-display";

export default withCommandDisplay(Command, [{
  usage: "nemoclaw capability-report",
  description: "Generate a local capability report (device, GPU, runtime endpoints)",
  group: "Troubleshooting",
  scope: "global",
  order: 41,
}]);
