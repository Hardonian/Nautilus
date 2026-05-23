// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Command from "../../lib/commands/gateway/start";
import { withCommandDisplay } from "../../lib/cli/command-display";

export default withCommandDisplay(Command, [
  {
    usage: "nemoclaw gateway start",
    description: "Start the API Gateway server",
    flags: "[--port <port>]",
    group: "Services",
    scope: "global",
    order: 40,
  },
]);
