// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ExecutionId, RuntimeExecutor } from "../core/nautilus-truth-loop";
import { getStatusReport } from "../inventory-commands";
import { buildStatusCommandDeps } from "../status-command-deps";
import { ROOT } from "../runner";

export class CrossSandboxRouter implements RuntimeExecutor {
  private currentIndex = 0;

  constructor(private readonly executors: Map<string, RuntimeExecutor>) {}

  public async run(input: { executionId: ExecutionId; correlationId: string; action?: string }): Promise<Record<string, unknown>> {
    // 1. Discover available sandboxes
    const deps = buildStatusCommandDeps(ROOT);
    const report = getStatusReport(deps);
    
    // 2. Filter healthy connected sandboxes
    const available = report.sandboxes.filter(s => s.connected);
    if (available.length === 0) {
      throw new Error("No healthy sandboxes available for execution routing");
    }

    // 3. Simple Round-Robin load balancing
    const targetSandbox = available[this.currentIndex % available.length];
    this.currentIndex++;

    // 4. Retrieve or create executor for target
    const executor = this.executors.get(targetSandbox.name);
    if (!executor) {
      throw new Error(`Executor not configured for sandbox: ${targetSandbox.name}`);
    }

    // 5. Delegate execution
    return executor.run(input);
  }
}
