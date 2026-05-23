"use strict";
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const nemoclaw_oclif_command_1 = require("../cli/nemoclaw-oclif-command");
const local_device_agent_1 = require("../control-plane/local-device-agent");
class CapabilityReportCommand extends nemoclaw_oclif_command_1.NemoClawCommand {
    static id = "capability-report";
    static strict = true;
    static summary = "Generate local device and runtime capability report";
    static description = "Generate and print a JSON capability report for local runtime endpoints.";
    static usage = ["capability-report [--endpoint <name=url>] [--stale-after-ms N] [--last-observed-at ISO]"];
    static examples = [
        "<%= config.bin %> <%= command.id %>",
        "<%= config.bin %> <%= command.id %> --endpoint local=http://127.0.0.1:12434",
    ];
    static flags = {
        endpoint: core_1.Flags.string({ multiple: true, description: "Runtime endpoint probe in form name=url" }),
        staleAfterMs: core_1.Flags.integer({ description: "Mark snapshot stale when last-observed age exceeds this value" }),
        lastObservedAt: core_1.Flags.string({ description: "Prior telemetry observation timestamp (ISO-8601)" }),
    };
    async run() {
        const { flags } = await this.parse(CapabilityReportCommand);
        const runtimeEndpoints = (flags.endpoint ?? []).flatMap((pair) => {
            const i = pair.indexOf("=");
            if (i <= 0)
                return [];
            return [{ name: pair.slice(0, i), endpoint: pair.slice(i + 1) }];
        });
        const report = await (0, local_device_agent_1.generateCapabilityReport)({ runtimeEndpoints, staleAfterMs: flags.staleAfterMs, lastObservedAtIso: flags.lastObservedAt });
        this.log((0, local_device_agent_1.formatCapabilityReportJson)(report));
        return report;
    }
}
exports.default = CapabilityReportCommand;
//# sourceMappingURL=capability-report.js.map