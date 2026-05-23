// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { run } from "@oclif/core";

async function main() {
  try {
    await run(["run-ci", "--action", "test-proofpack", "--fail-on-degraded"], process.cwd());
  } catch (err: any) {
    // Oclif might exit process or throw an error. We want the JSON output to be our proofpack.
    console.error("Caught error:", err);
    process.exit(err.oclif?.exit || 1);
  }
}

main();
