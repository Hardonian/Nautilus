// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

type State = "implemented" | "partial" | "planned" | "deprecated" | "unknown";

type Component = {
  name: string;
  state: State;
  implementationEvidence: string[];
  testEvidence: string[];
  docsEvidence: string[];
  ciEvidence: string[];
  exportEvidence: string[];
  driftFindings: string[];
  reasoning: string;
};

const docs = {
  current: readFileSync("docs/architecture/current-state.md", "utf8"),
  target: readFileSync("docs/architecture/target-state.md", "utf8"),
};

const rawFiles = execSync("find src test docs .github/workflows scripts -type f")
  .toString("utf8")
  .trim();
const files = rawFiles ? rawFiles.split("\n") : [];
const hasFile = (pattern: RegExp) => files.some((f) => pattern.test(f));

const components: Component[] = [
  {
    name: "control-plane",
    state: hasFile(/src\/lib\/control-plane\/control-plane\.test\.ts$/) ? "implemented" : "partial",
    implementationEvidence: [
      "src/lib/control-plane/orchestration.ts",
      "src/lib/control-plane/scheduler.ts",
    ],
    testEvidence: [
      "src/lib/control-plane/control-plane.test.ts",
      "src/lib/control-plane/runtime-seams.test.ts",
    ],
    docsEvidence: ["docs/architecture/current-state.md", "docs/architecture/target-state.md"],
    ciEvidence: [".github/workflows/ci.yml"],
    exportEvidence: ["src/lib/control-plane/evidence-export.ts"],
    driftFindings: [],
    reasoning: "Control-plane modules and tests exist and are wired into verification scripts.",
  },
  {
    name: "policy-egress-enforcement",
    state: hasFile(/test\/ssrf-parity\.test\.ts$/) ? "implemented" : "partial",
    implementationEvidence: ["src/lib/policies.ts", "src/lib/private-networks.ts"],
    testEvidence: ["test/ssrf-parity.test.ts", "test/config-set-nested-ssrf.test.ts"],
    docsEvidence: ["docs/verification/release-readiness.md"],
    ciEvidence: [".github/workflows/ci.yml"],
    exportEvidence: [],
    driftFindings: [],
    reasoning: "SSRF/policy tests and policy modules exist in repository truth paths.",
  },
  {
    name: "proofpack-replay-governance",
    state:
      hasFile(/scripts\/verify-proofpack\.ts$/) && hasFile(/scripts\/verify-replay\.ts$/)
        ? "implemented"
        : "partial",
    implementationEvidence: [
      "src/lib/control-plane/proofpack-ledger.ts",
      "src/lib/control-plane/replay.ts",
    ],
    testEvidence: ["src/lib/control-plane/proofpack-ledger.test.ts"],
    docsEvidence: ["docs/verification/release-readiness.md"],
    ciEvidence: [".github/workflows/ci.yml"],
    exportEvidence: ["scripts/verify-proofpack.ts", "scripts/verify-replay.ts"],
    driftFindings: [],
    reasoning: "Proofpack and replay verification surfaces are present and script-addressable.",
  },
];

for (const component of components) {
  for (const path of [
    ...component.implementationEvidence,
    ...component.testEvidence,
    ...component.docsEvidence,
  ]) {
    if (!files.includes(path)) {
      component.driftFindings.push(`Missing evidence file: ${path}`);
      component.state = component.state === "implemented" ? "partial" : component.state;
    }
  }
}

const staleClaims: string[] = [];
if (/does not yet implement a dedicated deterministic control plane/i.test(docs.current)) {
  staleClaims.push("current-state.md still claims deterministic control plane is not implemented.");
}
if (
  /target state/i.test(docs.target) &&
  /planned/i.test(docs.target) &&
  components.some((c) => c.state === "implemented")
) {
  staleClaims.push("target-state.md contains planned-only claims for implemented capabilities.");
}

const conflicting = components.filter(
  (c) =>
    c.state === "implemented" &&
    (c.testEvidence.length === 0 || c.implementationEvidence.length === 0),
);

const payload = {
  generatedAt: new Date().toISOString(),
  schemaVersion: "1.0.0",
  components,
  staleClaims,
};

mkdirSync("artifacts/governance", { recursive: true });
writeFileSync(
  "artifacts/governance/status-truth-map.json",
  `${JSON.stringify(payload, null, 2)}\n`,
);

if (
  staleClaims.length > 0 ||
  conflicting.length > 0 ||
  components.some((c) => c.driftFindings.length > 0)
) {
  console.error("verify:status-truth FAILED");
  for (const message of staleClaims) console.error(`- ${message}`);
  for (const c of components.filter((x) => x.driftFindings.length > 0)) {
    for (const finding of c.driftFindings) console.error(`- ${c.name}: ${finding}`);
  }
  process.exit(1);
}

console.log("verify:status-truth PASS");
