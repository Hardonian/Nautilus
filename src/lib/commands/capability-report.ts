// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Flags } from "@oclif/core";
import { NemoClawCommand } from "../cli/nemoclaw-oclif-command";
import { formatCapabilityReportJson, generateCapabilityReport } from "../control-plane/local-device-agent";

export default class CapabilityReportCommand extends NemoClawCommand {
  static id = "capability-report";
  static strict = true;
  static summary = "Generate local device and runtime capability report";
  static usage = ["capability-report [--endpoint <name=url>] [--stale-after-ms N] [--last-observed-at ISO]"];
  static flags = {
    endpoint: Flags.string({ multiple: true, description: "Runtime endpoint probe in form name=url" }),
    staleAfterMs: Flags.integer({ description: "Mark snapshot stale when last-observed age exceeds this value" }),
    lastObservedAt: Flags.string({ description: "Prior telemetry observation timestamp (ISO-8601)" }),
  };

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(CapabilityReportCommand);
    const runtimeEndpoints = (flags.endpoint ?? []).flatMap((pair) => {
      const i = pair.indexOf("=");
      if (i <= 0) return [];
      return [{ name: pair.slice(0, i), endpoint: pair.slice(i + 1) }];
    });
    const report = await generateCapabilityReport({ runtimeEndpoints, staleAfterMs: flags.staleAfterMs, lastObservedAtIso: flags.lastObservedAt });
    this.log(formatCapabilityReportJson(report));
    return report;
  }
}
