// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SCHEMA_VERSION,
  validateContract,
  type ContractKind,
  type ExecutionState,
} from "../../contracts/nautilus/index";
import { failureSemantics } from "../../src/lib/nautilus/failure-semantics";
import {
  transitionExecutionState,
  type StateTransitionEvent,
} from "../../src/lib/nautilus/state-machine";

export const FIXTURE_NOTICE =
  "deterministic fixture/sample; not live telemetry or production runtime output";
export const FIXTURE_TIMESTAMP = "2026-03-01T00:00:00.000Z";
export const FIXTURE_EXECUTION_ID = "exec-nautilus-mvp-0001";
export const FIXTURE_REPLAY_ID = "replay-nautilus-mvp-0001";

export type ScenarioName =
  | "golden-path"
  | "runtime-unavailable"
  | "policy-denied"
  | "retrieval-degraded"
  | "proofpack-partial"
  | "replay-from-evidence"
  | "stale-telemetry"
  | "storage-pressure"
  | "queue-saturation"
  | "full-mvp-demo";

export interface ScenarioDefinition {
  name: ScenarioName;
  title: string;
  command: string;
  degraded: boolean;
  finalState: ExecutionState;
  proofpackStatus: "complete" | "partial" | "unavailable" | "denied";
  runtimeStatus: "available" | "unavailable" | "degraded";
  retrievalMode: "historical" | "refresh" | "degraded";
  policyDecision: "allow" | "deny";
  failureKey?: keyof typeof failureSemantics;
  explanation: string;
  unsupportedClaims: string[];
}

export const scenarioDefinitions: ScenarioDefinition[] = [
  {
    name: "golden-path",
    title: "Golden path",
    command: "npm run nautilus:golden-path",
    degraded: false,
    finalState: "completed",
    proofpackStatus: "complete",
    runtimeStatus: "available",
    retrievalMode: "historical",
    policyDecision: "allow",
    explanation:
      "All fixture contracts validate and the deterministic execution lifecycle reaches completed.",
    unsupportedClaims: [
      "Does not start a live OpenShell sandbox.",
      "Does not contact GPU telemetry or model providers.",
    ],
  },
  {
    name: "runtime-unavailable",
    title: "Runtime unavailable",
    command: "npm run nautilus:runtime-health-smoke",
    degraded: true,
    finalState: "failed",
    proofpackStatus: "partial",
    runtimeStatus: "unavailable",
    retrievalMode: "historical",
    policyDecision: "allow",
    failureKey: "runtime_unavailable",
    explanation:
      "The runtime check is explicit about an unavailable sandbox and emits degraded fixture output instead of pretending runtime health is green.",
    unsupportedClaims: ["Does not repair or launch the sandbox automatically."],
  },
  {
    name: "policy-denied",
    title: "Policy denied",
    command: "npm run nautilus:examples -- policy-denied",
    degraded: true,
    finalState: "failed",
    proofpackStatus: "denied",
    runtimeStatus: "available",
    retrievalMode: "historical",
    policyDecision: "deny",
    explanation:
      "Policy denial is fail-closed: execution stops before retrieval or runtime mutation.",
    unsupportedClaims: ["Does not override policy or synthesize an allow decision."],
  },
  {
    name: "retrieval-degraded",
    title: "Retrieval degraded",
    command: "npm run nautilus:examples -- retrieval-degraded",
    degraded: true,
    finalState: "completed",
    proofpackStatus: "partial",
    runtimeStatus: "available",
    retrievalMode: "degraded",
    policyDecision: "allow",
    failureKey: "retrieval_unavailable",
    explanation:
      "Execution can continue with a visible retrieval degradation and lineage gap marker.",
    unsupportedClaims: ["Does not claim complete memory recall."],
  },
  {
    name: "proofpack-partial",
    title: "Proofpack partial",
    command: "npm run nautilus:proofpack-smoke",
    degraded: true,
    finalState: "completed",
    proofpackStatus: "partial",
    runtimeStatus: "available",
    retrievalMode: "historical",
    policyDecision: "allow",
    failureKey: "proofpack_generation_unavailable",
    explanation: "Proofpack generation can be partial while execution evidence remains replayable.",
    unsupportedClaims: ["Does not mark partial proofpacks as complete."],
  },
  {
    name: "replay-from-evidence",
    title: "Replay from evidence",
    command: "npm run nautilus:replay-smoke",
    degraded: false,
    finalState: "completed",
    proofpackStatus: "complete",
    runtimeStatus: "available",
    retrievalMode: "historical",
    policyDecision: "allow",
    explanation:
      "Replay reads deterministic evidence and reports reproducible state without live mutation.",
    unsupportedClaims: ["Does not replay external side effects."],
  },
  {
    name: "stale-telemetry",
    title: "Stale telemetry",
    command: "npm run nautilus:examples -- stale-telemetry",
    degraded: true,
    finalState: "completed",
    proofpackStatus: "partial",
    runtimeStatus: "degraded",
    retrievalMode: "historical",
    policyDecision: "allow",
    failureKey: "gpu_telemetry_stale",
    explanation: "Telemetry is marked stale and excluded from healthy-runtime claims.",
    unsupportedClaims: ["Does not infer current GPU health from stale samples."],
  },
  {
    name: "storage-pressure",
    title: "Storage pressure",
    command: "npm run nautilus:examples -- storage-pressure",
    degraded: true,
    finalState: "completed",
    proofpackStatus: "partial",
    runtimeStatus: "degraded",
    retrievalMode: "historical",
    policyDecision: "allow",
    failureKey: "storage_limit_reached",
    explanation: "Storage pressure remains visible and proofpack completeness is partial.",
    unsupportedClaims: ["Does not silently drop provenance records."],
  },
  {
    name: "queue-saturation",
    title: "Queue saturation",
    command: "npm run nautilus:examples -- queue-saturation",
    degraded: true,
    finalState: "failed",
    proofpackStatus: "partial",
    runtimeStatus: "degraded",
    retrievalMode: "historical",
    policyDecision: "allow",
    failureKey: "timeout",
    explanation:
      "Queue saturation is represented as a timeout/degraded package fixture with replayable terminal evidence.",
    unsupportedClaims: ["Does not invent scheduler capacity metrics."],
  },
  {
    name: "full-mvp-demo",
    title: "Full MVP demo",
    command: "npm run nautilus:examples -- full-mvp-demo",
    degraded: false,
    finalState: "completed",
    proofpackStatus: "complete",
    runtimeStatus: "available",
    retrievalMode: "refresh",
    policyDecision: "allow",
    explanation:
      "Combines execution, policy, retrieval, proofpack, runtime health, and replay fixture outputs into one deterministic demo package.",
    unsupportedClaims: ["Does not claim distributed multi-node orchestration is implemented."],
  },
];

export function getScenario(name: ScenarioName): ScenarioDefinition {
  const scenario = scenarioDefinitions.find((candidate) => candidate.name === name);
  if (!scenario) {
    throw new Error(`Unknown Nautilus scenario: ${name}`);
  }
  return scenario;
}

export function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), "test/fixtures/nautilus", name), "utf8")) as T;
}

function validateFixture(kind: ContractKind, payload: unknown): string[] {
  const result = validateContract(kind, payload);
  return result.ok ? [] : result.errors;
}

function stateTransitions(scenario: ScenarioDefinition): StateTransitionEvent[] {
  const base = {
    executionId: FIXTURE_EXECUTION_ID,
    correlationId: `corr-${scenario.name}`,
    timestamp: FIXTURE_TIMESTAMP,
  };
  const transitions: StateTransitionEvent[] = [
    transitionExecutionState("queued", "planning", { ...base, reason: "execution accepted" }),
    transitionExecutionState("planning", "policy_evaluation", { ...base, reason: "plan ready" }),
  ];

  if (scenario.policyDecision === "deny") {
    transitions.push(
      transitionExecutionState("policy_evaluation", "failed", { ...base, reason: "policy.denied" }),
    );
    return transitions;
  }

  if (scenario.retrievalMode === "degraded") {
    transitions.push(
      transitionExecutionState("policy_evaluation", "degraded", {
        ...base,
        reason: failureSemantics.retrieval_unavailable.event,
      }),
    );
    transitions.push(
      transitionExecutionState(
        "degraded",
        scenario.finalState === "failed" ? "failed" : "executing",
        { ...base, reason: "degraded retrieval acknowledged" },
      ),
    );
  } else {
    transitions.push(
      transitionExecutionState("policy_evaluation", "retrieval", {
        ...base,
        reason: "policy allow",
      }),
    );
    transitions.push(
      transitionExecutionState(
        "retrieval",
        scenario.runtimeStatus === "unavailable" ? "fallback" : "executing",
        {
          ...base,
          reason:
            scenario.runtimeStatus === "unavailable"
              ? failureSemantics.runtime_unavailable.event
              : "retrieval resolved",
        },
      ),
    );
    if (scenario.runtimeStatus === "unavailable") {
      transitions.push(
        transitionExecutionState("fallback", "failed", {
          ...base,
          reason: "runtime unavailable with no fallback runtime",
        }),
      );
      return transitions;
    }
  }

  if (transitions.at(-1)?.to === "executing") {
    transitions.push(
      transitionExecutionState("executing", scenario.finalState, {
        ...base,
        reason:
          scenario.finalState === "completed"
            ? "runtime completed"
            : scenario.failureKey
              ? failureSemantics[scenario.failureKey].event
              : "execution terminal",
      }),
    );
  }
  return transitions;
}

export function buildScenarioOutput(scenario: ScenarioDefinition) {
  const execution = loadFixture<Record<string, unknown>>("execution.json");
  const policy = {
    ...loadFixture<Record<string, unknown>>("policy.json"),
    decision: scenario.policyDecision,
  };
  const retrieval = {
    ...loadFixture<Record<string, unknown>>("retrieval.json"),
    mode: scenario.retrievalMode,
  };
  const runtimeHealth = {
    ...loadFixture<Record<string, unknown>>("runtime-health.json"),
    runtimeStatus: scenario.runtimeStatus,
    checks: [
      {
        name: "local-runtime",
        status: scenario.runtimeStatus,
        reason:
          scenario.runtimeStatus === "available"
            ? "fixture runtime path available"
            : "fixture does not require a running sandbox",
      },
      { name: "contracts", status: "available", reason: "contract validators loaded" },
    ],
  };
  const proofpack = {
    ...loadFixture<Record<string, unknown>>("proofpack.json"),
    status: scenario.proofpackStatus,
  };
  const validations = [
    ...validateFixture("execution", execution),
    ...validateFixture("policy", policy),
    ...validateFixture("retrieval", {
      kind: "retrieval",
      schemaVersion: SCHEMA_VERSION,
      mode: scenario.retrievalMode,
    }),
    ...validateFixture("runtime", {
      kind: "runtime",
      schemaVersion: SCHEMA_VERSION,
      runtimeStatus: scenario.runtimeStatus,
    }),
    ...validateFixture("proofpack", {
      kind: "proofpack",
      schemaVersion: SCHEMA_VERSION,
      proofpackScope: String((proofpack as any).proofpackScope),
    }),
  ];
  const events = stateTransitions(scenario);
  return {
    kind: "nautilus.mvp.scenario",
    schemaVersion: SCHEMA_VERSION,
    fixture: true,
    deterministicSample: true,
    notice: FIXTURE_NOTICE,
    generatedAt: FIXTURE_TIMESTAMP,
    scenario: scenario.name,
    title: scenario.title,
    ok:
      validations.length === 0 &&
      scenario.policyDecision !== "deny" &&
      scenario.finalState !== "failed",
    degraded: scenario.degraded,
    finalState: scenario.finalState,
    command: scenario.command,
    explanation: scenario.explanation,
    unsupportedClaims: scenario.unsupportedClaims,
    failure: scenario.failureKey
      ? {
          key: scenario.failureKey,
          visibleState: failureSemantics[scenario.failureKey].visibleState,
          failBehavior: failureSemantics[scenario.failureKey].failBehavior,
          event: failureSemantics[scenario.failureKey].event,
          recovery: failureSemantics[scenario.failureKey].recovery,
        }
      : null,
    evidence: {
      executionId: FIXTURE_EXECUTION_ID,
      idempotencyKey: execution.idempotencyKey,
      policy,
      retrieval,
      runtimeHealth,
      events,
      trace: loadFixture("trace.json"),
      memory: {
        ...loadFixture<Record<string, unknown>>("memory.json"),
        lineageGap: scenario.retrievalMode === "degraded",
      },
      proofpack,
    },
    validation: {
      ok: validations.length === 0,
      errors: validations,
    },
  };
}

export function buildProofpack(status: "complete" | "partial") {
  const scenario = getScenario(status === "complete" ? "golden-path" : "proofpack-partial");
  const output = buildScenarioOutput(scenario);
  return {
    kind: "nautilus.proofpack.sample",
    schemaVersion: SCHEMA_VERSION,
    fixture: true,
    deterministicSample: true,
    notice: FIXTURE_NOTICE,
    generatedAt: FIXTURE_TIMESTAMP,
    status,
    completeness: status === "complete" ? "complete" : "partial",
    executionId: FIXTURE_EXECUTION_ID,
    evidenceCount: output.evidence.events.length,
    degradedReasons:
      status === "partial" ? [failureSemantics.proofpack_generation_unavailable.event] : [],
    evidence: output.evidence,
  };
}

export function buildReplayReport() {
  const output = buildScenarioOutput(getScenario("replay-from-evidence"));
  return {
    kind: "nautilus.replay.report.sample",
    schemaVersion: SCHEMA_VERSION,
    fixture: true,
    deterministicSample: true,
    notice: FIXTURE_NOTICE,
    generatedAt: FIXTURE_TIMESTAMP,
    replayId: FIXTURE_REPLAY_ID,
    replayMode: "read_only",
    sourceExecutionId: FIXTURE_EXECUTION_ID,
    reproducedFinalState: output.finalState,
    mutationSafe: true,
    evidenceDigest: "sha256:fixture-nautilus-replay-0001",
    eventsReplayed: output.evidence.events.length,
  };
}

export function buildOperatorReport() {
  return {
    kind: "nautilus.operator.report.sample",
    schemaVersion: SCHEMA_VERSION,
    fixture: true,
    deterministicSample: true,
    notice: FIXTURE_NOTICE,
    generatedAt: FIXTURE_TIMESTAMP,
    packageReady: true,
    commands: scenarioDefinitions.map((scenario) => scenario.command),
    degradedStatesDocumented: scenarioDefinitions
      .filter((scenario) => scenario.degraded)
      .map((scenario) => scenario.name),
    unsupportedFeaturesDocumented: true,
  };
}

export function buildRuntimeHealthDegraded() {
  const scenario = buildScenarioOutput(getScenario("runtime-unavailable"));
  return {
    kind: "nautilus.runtime.health.sample",
    schemaVersion: SCHEMA_VERSION,
    fixture: true,
    deterministicSample: true,
    notice: FIXTURE_NOTICE,
    generatedAt: FIXTURE_TIMESTAMP,
    runtimeStatus: "unavailable",
    degraded: true,
    checks: scenario.evidence.runtimeHealth.checks,
    recovery: failureSemantics.runtime_unavailable.recovery,
  };
}
