// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Flags } from "@oclif/core";
import { NemoClawCommand } from "../cli/nemoclaw-oclif-command";
import { NautilusCIRunner } from "../core/ci-runner";
import { InMemoryNautilusEventBus } from "../core/nautilus-event-fabric";
import type { TruthLoopDependencies, RuntimeExecutor } from "../core/nautilus-truth-loop";
import type { ApprovalGate } from "../core/threatmesh";
import { appendToLedger } from "../control-plane/proofpack-ledger";

export default class RunCiCommand extends NemoClawCommand {
  static id = "run-ci";
  static summary = "Run Nautilus execution loop headlessly for CI/CD";
  static description = "Execute a command securely with deterministic JSON output.";
  static usage = ["run-ci --action <action> [--fail-on-degraded]"];
  static examples = [
    '<%= config.bin %> run-ci --action "inspect runtime"',
    '<%= config.bin %> run-ci --action "inspect runtime" --fail-on-degraded',
  ];
  static flags = {
    action: Flags.string({ char: "a", description: "The action to execute", required: true }),
    "fail-on-degraded": Flags.boolean({ description: "Exit with code 4 if execution degrades", default: false }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(RunCiCommand);

    // Bootstrap deterministic dependencies
    // Note: In a real flow, these would be injected via a factory.
    // For this milestone, we provide the foundational scaffold.
    const eventBus = new InMemoryNautilusEventBus();
    const runtime: RuntimeExecutor = {
      run: async () => ({ simulated: true, action: flags.action }),
    };
    const policyGate: ApprovalGate = {
      evaluate: (action) => {
        // Simple deny list for demonstration
        if (action.includes("rm -rf")) return { allowed: false, reasons: ["Destructive action"], action, trustScore: { value: 0, source: "mock" }, riskSignals: [] };
        return { allowed: true, reasons: [], action, trustScore: { value: 100, source: "mock" }, riskSignals: [] };
      },
    };

    const deps: TruthLoopDependencies = {
      eventBus,
      runtime,
      policyGate,
      proofpackSink: appendToLedger,
    };

    const runner = new NautilusCIRunner(deps);
    const result = await runner.run({
      executionId: `exec-ci-${Date.now()}` as any, // casting to bypass strict __type brand
      correlationId: `corr-ci-${Date.now()}`,
      action: flags.action,
      failOnDegraded: flags["fail-on-degraded"],
    });

    this.logJson(result);

    if (result.exitCode !== 0) {
      this.exit(result.exitCode);
    }
  }
}
