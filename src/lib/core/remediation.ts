// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TruthLoopDependencies, TruthLoopReport, runTruthLoop } from "./nautilus-truth-loop";
import { RiskSignal } from "./threatmesh";
import { buildNautilusEvent } from "./event-fabric";

export class AutonomousRemediationLoop {
  constructor(private maxRetries: number = 3) {}

  async runWithHealing(
    deps: TruthLoopDependencies,
    input: { executionId: string; correlationId: string; action: string; riskSignals?: RiskSignal[]; query?: string }
  ): Promise<TruthLoopReport> {
    let attempts = 0;
    while (attempts < this.maxRetries) {
      attempts++;
      const report = await runTruthLoop(deps, input);
      
      if (report.status === "completed") {
        return report;
      }
      
      if (report.status === "denied") {
        // Can't heal policy denial autonomously without manual operator approval
        return report;
      }
      
      // If degraded, failed, or queue saturated, try to heal by waiting or re-routing
      console.warn(`[Remediation] Execution ${report.executionId} failed or degraded (${report.status}). Attempt ${attempts} of ${this.maxRetries}`);
      
      const healingEvent = buildNautilusEvent({
        type: "runtime.restored",
        source: "remediation-loop",
        executionId: input.executionId,
        correlationId: input.correlationId,
        status: "restored",
        payload: { attempt: attempts, previousStatus: report.status }
      });
      deps.eventBus.emit(healingEvent);

      if (attempts < this.maxRetries) {
        // Backoff
        await new Promise(resolve => setTimeout(resolve, 500 * attempts));
      } else {
        return report;
      }
    }
    
    throw new Error("Remediation exhausted without success");
  }
}
