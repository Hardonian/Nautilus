<!-- start-badges -->
<!-- end-badges -->
<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus: Deterministic Operational AI Infrastructure Platform

Nautilus is the platform identity for deterministic operational AI infrastructure. NemoClaw remains the runtime/orchestration engine inside the platform.

## Why Nautilus exists
## Nautilus platform structure

- **NemoClaw Runtime** (`src/`, `nemoclaw/src/`, `bin/`)
- **RecallForge** (`core/recallforge/`)
- **OperatorGraph** (`core/operatorgraph/`, `operator-console/`)
- **ThreatMesh** (`core/threatmesh/`, security and policy modules)
- **MeshRAG** (`core/meshrag/`)
- **Canonical Event Fabric** (`core/event-fabric/contracts.ts`)

See the architecture truth + migration plan: [docs/nautilus/platform-evolution.md](docs/nautilus/platform-evolution.md).


The fork prioritizes deterministic and auditable control over opaque autonomy. It focuses on:
- execution plane and control plane separation,
- truthful degraded-state reporting,
- execution receipts/provenance,
- supervised policy promotion,
- explainable routing/control decisions.

## Current state vs roadmap

- **Implemented:** existing CLI/plugin/sandbox orchestration and inference onboarding flows; control-plane verification gates.
- **Scaffolded:** remote execution and telemetry adapter seams with explicit degraded-state reporting.
- **Opt-in:** governed routing (`NEMOCLAW_GOVERNED_ROUTING=1`) and heterogeneous bridge (`NEMOCLAW_HETEROGENEOUS_ROUTING=1`).
- **Planned:** external orchestration adapter integrations after stable local contracts.
- **Not implemented:** distributed execution, GPU balancing, Dynamo integration, autonomous orchestration/self-healing, automatic policy learning.


## Nautilus M1 truth loop status (implemented now)

Implemented in `src/lib/core/nautilus-truth-loop.ts` with tests in `src/lib/core/nautilus-truth-loop.test.ts`:
- Event Fabric envelope emission for `execution.started`, `policy.evaluated`, and terminal execution events.
- ThreatMesh fail-closed behavior when policy engine is unavailable.
- OperatorGraph trace correlation via shared `correlationId`/`traceId` semantics (in-memory adapter wiring).
- MeshRAG explicit retrieval states: `completed` or `unavailable` (degraded path, no simulated retrieval).
- RecallForge memory writes with required source-event provenance on successful completion.
- Operator report object (`TruthLoopReport`) that summarizes execution outcome and degraded states.

Explicit degraded/unavailable states currently surfaced:
- `policy_engine_unavailable` (fail-closed deny)
- `retrieval_engine_unavailable`
- `memory_store_unavailable`
- `trace_store_unavailable`

Scaffolded (not fully materialized): persistent trace store adapters, persistent memory backends, GPU telemetry integration, and local model runtime health adapters.

## Architecture and planning docs

- Fork rationale: [docs/fork-rationale.md](docs/fork-rationale.md)
- Current-state architecture audit: [docs/architecture/current-state.md](docs/architecture/current-state.md)
- Target-state architecture: [docs/architecture/target-state.md](docs/architecture/target-state.md)
- Roadmap and dependencies: [docs/roadmap.md](docs/roadmap.md)
- Verification matrix: [docs/verification/verification-matrix.md](docs/verification/verification-matrix.md)
- PR verification/reporting guide: [docs/contributing/pr-template-guide.md](docs/contributing/pr-template-guide.md)
- Branch strategy: [docs/contributing/branch-strategy.md](docs/contributing/branch-strategy.md)
- RC1 hardening report: [docs/release/nautilus-rc1-hardening.md](docs/release/nautilus-rc1-hardening.md)

## Security hardening doctrine

- Security threat model: [docs/architecture/security-threat-model.md](docs/architecture/security-threat-model.md)
- Security policy model: [docs/architecture/security-policy-model.md](docs/architecture/security-policy-model.md)
- Transport security: [docs/architecture/transport-security.md](docs/architecture/transport-security.md)
- Secret redaction doctrine: [docs/architecture/secret-redaction-doctrine.md](docs/architecture/secret-redaction-doctrine.md)
- Command execution safety: [docs/architecture/command-execution-safety.md](docs/architecture/command-execution-safety.md)
- Local-stack security profiles: [docs/architecture/local-stack-security-profiles.md](docs/architecture/local-stack-security-profiles.md)
- Security verification matrix: [docs/verification/security-verification-matrix.md](docs/verification/security-verification-matrix.md)

## Control-plane discipline

Control-plane discipline means decisions are governed by inspectable contracts, policy artifacts, and verifiable receipts; not by hidden fallbacks or prompt-only instructions.

## Contribution guidance

When contributing:
1. Distinguish current repository truth from target-state design.
2. Avoid implementation claims unless backed by code and tests in the same PR.
3. Include verification commands and observed outcomes in PR descriptions.

## Not implemented yet (explicitly not implemented in this checkpoint)

Unless specifically added and verified in code:
- no dedicated deterministic scheduler,
- no dedicated device registry,
- no dedicated policy-promotion engine,
- no unified execution receipt framework,
- no Dynamo-style orchestration integration,
- no distributed execution handoff,
- no GPU balancing,
- no autonomous orchestration or self-healing loops,
- no automatic policy learning.


## Local bootstrap fallback
If lifecycle scripts fail in restricted environments, contributors can use `npm install --ignore-scripts` for local verification only, then run typecheck/tests manually. Production/release flows should keep normal install behavior.


## Verification

Preferred contributor flow:

```bash
npm run verify:changelog-hygiene
npm run verify:core
npm run verify:release
```

- `verify:core` reports deterministic `PASS/WARN/FAIL` status across changelog hygiene, typecheck, lint, and targeted control-plane/probe/governed-routing suites.
- `verify:release` is the primary release gate for local and CI readiness checks.
- `verify:all` remains available as a strict-mode variant of `verify:core` that fails for both repository failures and missing required toolchain/dependencies.
- In restricted local environments, `npm install --ignore-scripts` is a local diagnosis fallback only and must not be used for release packaging or CI baselines.


### Residual matrix closure status (2026-05-09)
The governed substrate closure pass is verification-focused: direct branch assertions, replay/diagnostics truth hardening, and status-document coherence. It does not add orchestration, distributed execution, GPU balancing, Dynamo integration, autonomous routing, or automatic policy/trust mutation.

<!-- platform-matrix:begin -->
<!-- platform-matrix:end -->

## Nautilus MVP foundation (May 2026)
- Added hardened Nautilus contracts, state machine transition events, failure semantics matrix, and a deterministic golden-path smoke (`npm run nautilus:golden-path`).
- Verification commands: `npm install`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:cli`, `npm run nautilus:golden-path`.
- Intentionally degraded paths: runtime unavailable, retrieval unavailable, telemetry unavailable/stale, trace store unavailable, and proofpack generation unavailable remain explicit degraded modes.
- Not yet supported: distributed replay orchestration, durable evidence storage, and cross-cluster execution consensus.
