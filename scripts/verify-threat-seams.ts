// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from "node:child_process";

const suites = [
  ["npx", "vitest", "run", "test/ssrf-parity.test.ts", "test/config-set-nested-ssrf.test.ts"],
  [
    "npx",
    "vitest",
    "run",
    "src/lib/control-plane/runtime-seams.test.ts",
    "src/lib/control-plane/degraded-taxonomy.test.ts",
  ],
];

for (const [cmd, ...args] of suites) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`verify:threat-seams FAILED at ${cmd} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

console.log("verify:threat-seams PASS");
