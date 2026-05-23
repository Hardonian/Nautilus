// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { runTruthLoop, type TruthLoopDependencies, type TruthLoopReport } from "./nautilus-truth-loop";
import type { RiskSignal } from "./threatmesh";

export interface CIRunnerInput {
  executionId: string;
  correlationId: string;
  action: string;
  query?: string;
  riskSignals?: RiskSignal[];
  failOnDegraded?: boolean;
}

export interface CIRunnerResult {
  exitCode: number;
  report: TruthLoopReport;
}

export class NautilusCIRunner {
  constructor(private readonly deps: TruthLoopDependencies) {}

  async run(input: CIRunnerInput): Promise<CIRunnerResult> {
    const report = await runTruthLoop(this.deps, {
      executionId: input.executionId,
      correlationId: input.correlationId,
      action: input.action,
      query: input.query,
      riskSignals: input.riskSignals,
    });

    let exitCode = 0;

    if (report.status === "failed") {
      exitCode = 1;
    } else if (report.status === "denied") {
      exitCode = 2;
    } else if (report.status === "queue_saturated") {
      exitCode = 3;
    } else if (input.failOnDegraded && report.degraded.length > 0) {
      exitCode = 4;
    }

    return {
      exitCode,
      report,
    };
  }
}
