// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  capabilityFromEnv,
  compactHandoff,
  recursiveCollaborate,
  routeModel,
  type AgentHandoffState,
} from "../src/lib/control-plane/orchestration";

const now = new Date().toISOString();
const handoff: AgentHandoffState = {
  schemaVersion: "1.0.0",
  taskId: "proof-orchestration",
  currentRunId: "proof-run",
  phase: "route",
  objective: "Produce deterministic orchestration proofpack",
  constraints: ["no_fake_telemetry", "privacy_fail_closed"],
  acceptedFacts: ["retrieval_sufficient"],
  rejectedFacts: [],
  openQuestions: [],
  decisionsMade: [],
  toolEvidenceRefs: ["cmd:npm_run_test"],
  fileEvidenceRefs: ["src/lib/control-plane/orchestration.ts"],
  commandEvidenceRefs: ["npm run proof:orchestration"],
  compactWorkingState: { sample: true, payload: "x".repeat(2048) },
  confidence: 0.4,
  riskFlags: ["backend_optional"],
  tokenBudget: {
    maxInputTokens: 4096,
    maxOutputTokens: 1024,
    reservedForSystem: 256,
    reservedForEvidence: 512,
    reservedForFinal: 256,
    estimatedInput: 1024,
    estimatedOutput: 256,
    budgetStatus: "ok",
  },
  latencyClass: "standard",
  modelClassNeeded: "long_context",
  gpuPreference: "neutral",
  privacyClass: "local_only",
  maxRounds: 2,
  currentRound: 0,
  createdAt: now,
  updatedAt: now,
};

const capabilities = capabilityFromEnv(process.env);
const compressed = compactHandoff(handoff, 900);
const route = routeModel({
  handoff,
  capabilities,
  estimatedInputTokens: 1024,
  retrievalSufficient: true,
});
const collaboration = recursiveCollaborate({
  initial: handoff,
  mode: "recursive_compact",
  maxRounds: 2,
  confidenceThreshold: 0.9,
});

const proof = {
  kind: "nautilus.orchestration.proofpack",
  schemaVersion: "1.0.0",
  generatedAt: now,
  capabilityRegistry: capabilities,
  routeDecision: route,
  handoff: {
    originalBytes: compressed.originalBytes,
    compressedBytes: compressed.compressedBytes,
    compressionRatio: compressed.reductionRatio,
    droppedSections: compressed.droppedSections,
  },
  collaboration: {
    roundsExecuted: collaboration.roundsExecuted,
    terminationReason: collaboration.terminationReason,
    telemetry: collaboration.telemetry,
  },
  degraded: route.degradationReason ? [route.degradationReason] : [],
};

const outputDir = process.env.NAUTILUS_PROOFPACK_OUTPUT_DIR || "examples/nautilus/outputs";
mkdirSync(outputDir, { recursive: true });
const file = join(outputDir, "proofpack.orchestration.json");
writeFileSync(file, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, output: file }, null, 2));
