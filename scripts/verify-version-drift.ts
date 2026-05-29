// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "node:fs";

type Allow = { key: string; root: string; nemoclaw: string; reason: string };

type Pkg = {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const root = JSON.parse(readFileSync("package.json", "utf8")) as Pkg;
const nested = JSON.parse(readFileSync("nemoclaw/package.json", "utf8")) as Pkg;

const issues: string[] = [];
const allowlist = JSON.parse(
  readFileSync("docs/verification/version-drift-allowlist.json", "utf8"),
) as { allowed: Allow[] };
const isAllowed = (key: string, rootV: string, nestedV: string) =>
  allowlist.allowed.some((a) => a.key === key && a.root === rootV && a.nemoclaw === nestedV);
if (root.version !== nested.version) {
  issues.push(`Version drift: root=${root.version} nemoclaw=${nested.version}`);
}

for (const dep of ["typescript", "vitest"]) {
  const a = root.devDependencies?.[dep];
  const b = nested.devDependencies?.[dep];
  if (a && b && a !== b && !isAllowed(`devDependency:${dep}`, a, b))
    issues.push(`Tooling drift for ${dep}: root=${a} nemoclaw=${b}`);
}

if (issues.length) {
  console.error("verify:version-drift FAILED");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}
console.log("verify:version-drift PASS");
