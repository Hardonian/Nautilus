// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const ARTIFACTS_DIR = join(ROOT, "artifacts");
mkdirSync(ARTIFACTS_DIR, { recursive: true });

const BUILD_TIMESTAMP = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString();

function walkFiles(path: string, out: string[]): void {
  for (const entry of readdirSync(path)) {
    const target = join(path, entry);
    const stat = statSync(target);
    if (stat.isDirectory()) {
      walkFiles(target, out);
      continue;
    }
    out.push(target);
  }
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

const packageFiles = ["package.json", "package-lock.json"];
const packageHashes = packageFiles
  .filter((file) => statSync(join(ROOT, file), { throwIfNoEntry: false }))
  .map((file) => ({ file, sha256: sha256File(join(ROOT, file)) }));

const smokeDir = join(ARTIFACTS_DIR, "smoke-output");
const proofpackDir = join(ARTIFACTS_DIR, "proofpack");
const bundleDir = join(ARTIFACTS_DIR, "release-bundle");
mkdirSync(smokeDir, { recursive: true });
mkdirSync(proofpackDir, { recursive: true });
mkdirSync(bundleDir, { recursive: true });

const smokeCommands = [
  ["golden-path", "npm run nautilus:golden-path"],
  ["replay-smoke", "npm run nautilus:replay-smoke"],
  ["proofpack-smoke", "npm run nautilus:proofpack-smoke"],
  ["runtime-health-smoke", "npm run nautilus:runtime-health-smoke"],
  ["examples", "npm run nautilus:examples"],
] as const;

for (const [name, command] of smokeCommands) {
  const output = execSync(command, { encoding: "utf8" });
  writeFileSync(join(smokeDir, `${name}.json`), output);
}

writeFileSync(
  join(proofpackDir, "sample-proofpack.json"),
  readFileSync(join(smokeDir, "proofpack-smoke.json"), "utf8"),
);
writeFileSync(
  join(proofpackDir, "sample-replay.json"),
  readFileSync(join(smokeDir, "replay-smoke.json"), "utf8"),
);

const verificationSummaryPath = join(ARTIFACTS_DIR, "verification-summary.json");
if (!statSync(verificationSummaryPath, { throwIfNoEntry: false })) {
  writeFileSync(
    verificationSummaryPath,
    `${JSON.stringify(
      {
        generatedAt: BUILD_TIMESTAMP,
        status: "degraded",
        checks: [],
        note: "Run npm run verification:summary to produce deterministic check results.",
      },
      null,
      2,
    )}\n`,
  );
}

const zipSourceFiles: string[] = [];
walkFiles(ARTIFACTS_DIR, zipSourceFiles);
const releaseBundleIndex = {
  generatedAt: BUILD_TIMESTAMP,
  files: zipSourceFiles
    .map((filePath) => ({
      path: relative(ARTIFACTS_DIR, filePath),
      sha256: sha256File(filePath),
    }))
    .sort((a, b) => a.path.localeCompare(b.path)),
};
writeFileSync(join(bundleDir, "index.json"), `${JSON.stringify(releaseBundleIndex, null, 2)}\n`);

const manifest = {
  commit: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
  branch: execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim(),
  buildTimestamp: BUILD_TIMESTAMP,
  nodeVersion: execSync("node --version", { encoding: "utf8" }).trim(),
  npmVersion: execSync("npm --version", { encoding: "utf8" }).trim(),
  packageHashes,
  verificationSummary: relative(ROOT, verificationSummaryPath),
  releaseBundleIndex: "artifacts/release-bundle/index.json",
};

writeFileSync(
  join(ARTIFACTS_DIR, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
