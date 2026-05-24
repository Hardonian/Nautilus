// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../runner";
import { Proofpack } from "./proofpacks";

export class PolicyDistillationEngine {
  private readonly ledgerDir = path.join(ROOT, ".nemoclaw", "ledger");
  private readonly datasetDir = path.join(ROOT, ".nemoclaw", "datasets");

  constructor() {
    if (!fs.existsSync(this.ledgerDir)) {
      fs.mkdirSync(this.ledgerDir, { recursive: true });
    }
    if (!fs.existsSync(this.datasetDir)) {
      fs.mkdirSync(this.datasetDir, { recursive: true });
    }
  }

  public async distill(): Promise<{ recordsProcessed: number; datasetFile: string }> {
    const files = await fs.promises.readdir(this.ledgerDir);
    const distillationDate = new Date().toISOString().replace(/[:.]/g, "-");
    const datasetPath = path.join(this.datasetDir, `rlhf-distillation-${distillationDate}.jsonl`);

    let processedCount = 0;
    const writeStream = fs.createWriteStream(datasetPath, { flags: "a" });

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(this.ledgerDir, file);
      try {
        const data = await fs.promises.readFile(filePath, "utf8");
        const proofpack = JSON.parse(data) as Proofpack;

        const isDenied = proofpack.degradedStates.some(s => s.includes("denied") || s.includes("fail_closed_denied"));
        const isFailed = proofpack.eventLineage.some(e => e.type === "execution.failed");
        const isSaturated = proofpack.degradedStates.some(s => s.includes("queue_saturated"));

        if (isDenied || isFailed || isSaturated) {
          // Create synthetic RLHF preference pair: rejected trajectory
          const datasetEntry = {
            executionId: proofpack.executionId,
            context: proofpack.eventLineage.map(e => e.payload),
            outcome: isDenied ? "policy_violation" : isFailed ? "execution_error" : "resource_exhaustion",
            degradedStates: proofpack.degradedStates,
            synthetic_preference: "rejected"
          };
          writeStream.write(JSON.stringify(datasetEntry) + "\n");
          processedCount++;
        }
      } catch (err) {
        console.error(`[DistillationEngine] Failed to process ${file}:`, err);
      }
    }

    writeStream.end();

    return {
      recordsProcessed: processedCount,
      datasetFile: datasetPath,
    };
  }
}
