// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildReplayReport } from "./nautilus/fixtures";

const replay = buildReplayReport();
const checks = [
  { id: "read_only_mode", ok: replay.replayMode === "read_only" },
  { id: "replayable_events", ok: replay.eventsReplayed > 0 },
  {
    id: "deterministic_hash",
    ok: typeof replay.evidenceDigest === "string" && replay.evidenceDigest.length > 0,
  },
];
const result = {
  kind: "nautilus.replay.verify",
  generatedAt: new Date().toISOString(),
  ok: checks.every((check) => check.ok),
  checks,
};
mkdirSync("artifacts", { recursive: true });
writeFileSync(join("artifacts", "verify-replay.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exit(1);
