<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Fork Roadmap

## Dependency map

## Release-readiness status taxonomy (2026-05-09)
- **Implemented:** baseline CLI/plugin flows and deterministic verification contracts already in repository truth.
- **Scaffolded:** adapter seams and diagnostics for governed heterogeneous execution, without distributed autonomy.
- **Opt-in:** governed/heterogeneous routing flags; disabled by default.
- **Planned:** external orchestration adapter integrations, contingent on stable local control contracts.
- **Not implemented:** distributed execution, GPU balancing, Dynamo-native orchestration, self-healing loops, automatic policy learning.


### Parallel-safe early work
- docs/foundation
- architecture audit
- ADRs
- verification matrix

### Core dependency chain
1. control-plane contracts
2. device registry contracts
3. receipt/degraded-state primitives
4. policy engine
5. deterministic scheduler
6. operational memory
7. observability
8. hardening/replay

Rationale:
- Scheduler depends on registry because deterministic candidate evaluation requires explicit device/capability inputs.
- Scheduler must consult policy to ensure decisions are governable and enforceable.
- Operational memory depends on receipts to preserve attributable evidence for recommendations.
- Observability depends on receipts and registry to explain what happened and where.
- Hardening depends on prior control-path semantics so fail-closed rules target real contracts.
- Dynamo/GPU orchestration remains adapter-based future work and should not precede stable local contracts.

## Workstreams

### 1) docs/foundation
- Purpose: establish truthful architecture/governance documentation baseline.
- Deliverables: fork rationale, README clarity, architecture index links.
- Dependencies: none.
- Parallelization potential: high.
- Exit criteria: contributors can distinguish current truth vs roadmap quickly.
- Verification expectations: docs build passes.
- Risks: over-claiming implementation.
- Suggested branch name: `docs/foundation-baseline`
- Suggested commit style: `docs(scope): ...`
- Suggested PR title: `docs: establish fork documentation foundation`

### 2) architecture audit
- Purpose: repository-truth inventory of execution/control-adjacent surfaces.
- Deliverables: `docs/architecture/current-state.md`.
- Dependencies: none.
- Parallelization potential: high.
- Exit criteria: audit sections completed with file-grounded statements.
- Verification expectations: peer audit spot-checks.
- Risks: stale findings as code evolves.
- Suggested branch name: `docs/architecture-current-state`
- Suggested commit style: `docs(architecture): ...`
- Suggested PR title: `docs: add current-state architecture audit`

### 3) control-plane scaffolding
- Purpose: define contract-first control-plane seams.
- Deliverables: request/decision type contracts and baseline tests.
- Dependencies: workstreams 1-2.
- Parallelization potential: medium.
- Exit criteria: execution entrypoints consume control-plane decision contract.
- Verification expectations: deterministic contract tests.
- Risks: interface churn.
- Suggested branch name: `feat/control-plane-contracts`
- Suggested commit style: `feat(control-plane): ...`
- Suggested PR title: `feat: scaffold deterministic control-plane contracts`

### 4) device registry
- Purpose: represent heterogeneous local devices as schedulable inputs.
- Deliverables: device and capability snapshot contracts/storage.
- Dependencies: 3.
- Parallelization potential: medium.
- Exit criteria: registry APIs and validation tests merged.
- Verification expectations: schema + snapshot integrity tests.
- Risks: stale health data.
- Suggested branch name: `feat/device-registry-contracts`
- Suggested commit style: `feat(registry): ...`
- Suggested PR title: `feat: add device registry contract layer`

### 5) receipts and degraded states
- Purpose: enforce truthful evidence and degradation semantics.
- Deliverables: receipt schema and degraded taxonomy primitives.
- Dependencies: 3.
- Parallelization potential: medium-high.
- Exit criteria: control decisions emit typed receipts/degraded codes.
- Verification expectations: schema and end-to-end assertions.
- Risks: incomplete coverage across paths.
- Suggested branch name: `feat/receipts-degraded-primitives`
- Suggested commit style: `feat(receipts): ...`
- Suggested PR title: `feat: introduce receipt and degraded-state primitives`

### 6) policy engine and approvals
- Purpose: evaluate inspectable policy and gate promotions.
- Deliverables: policy evaluator, approval workflow contracts.
- Dependencies: 3, 5.
- Parallelization potential: medium.
- Exit criteria: policy verdict required for scheduling.
- Verification expectations: policy golden tests and approval flow tests.
- Risks: policy sprawl.
- Suggested branch name: `feat/policy-engine-approvals`
- Suggested commit style: `feat(policy): ...`
- Suggested PR title: `feat: add policy engine and approval gates`

### 7) deterministic scheduler
- Purpose: deterministic selection across eligible candidates.
- Deliverables: scheduler module with explainable outcomes.
- Dependencies: 4, 6.
- Parallelization potential: low-medium.
- Exit criteria: stable tie-break and rejection reasons in outputs.
- Verification expectations: property + regression tests.
- Risks: hidden heuristics.
- Suggested branch name: `feat/deterministic-scheduler`
- Suggested commit style: `feat(scheduler): ...`
- Suggested PR title: `feat: implement deterministic scheduler`

### 8) operational memory
- Purpose: capture repeated operator decisions for supervised recommendations.
- Deliverables: append-only memory records linked to receipts.
- Dependencies: 5, 6, 7.
- Parallelization potential: medium.
- Exit criteria: memory artifacts produced without policy auto-mutation.
- Verification expectations: append-only and traceability tests.
- Risks: accidental policy drift.
- Suggested branch name: `feat/operational-memory`
- Suggested commit style: `feat(memory): ...`
- Suggested PR title: `feat: add operational memory scaffolding`

### 9) observability
- Purpose: unify control-path evidence and diagnostics.
- Deliverables: structured events with receipt correlation.
- Dependencies: 4, 5, 7.
- Parallelization potential: medium.
- Exit criteria: explainable event trail for each decision.
- Verification expectations: event schema + correlation tests.
- Risks: partial visibility.
- Suggested branch name: `feat/control-observability`
- Suggested commit style: `feat(observability): ...`
- Suggested PR title: `feat: add control-plane observability contracts`

### 10) hardening and replayability
- Purpose: strengthen fail-closed behavior and replay discipline.
- Deliverables: hardening rules and replay tooling/tests.
- Dependencies: 3-9.
- Parallelization potential: low.
- Exit criteria: replay passes and sensitive paths enforce fail-closed semantics.
- Verification expectations: security checks + replay tests.
- Risks: false confidence if contracts incomplete.
- Suggested branch name: `feat/hardening-replay`
- Suggested commit style: `feat(hardening): ...`
- Suggested PR title: `feat: add hardening and replayability gates`

### 11) future Dynamo/GPU orchestration adapter
- Purpose: optional adapter seam for future external orchestration.
- Deliverables: interface contracts and compatibility tests.
- Dependencies: stable local contracts from 3-10.
- Parallelization potential: low.
- Exit criteria: adapter does not alter local core contracts.
- Verification expectations: adapter conformance tests.
- Risks: premature coupling.
- Suggested branch name: `feat/dynamo-adapter-seam`
- Suggested commit style: `feat(adapter): ...`
- Suggested PR title: `feat: scaffold Dynamo-style orchestration adapter seam`

## Control-plane foundation (implemented)
- Deterministic contracts, device registry substrate, receipt/degraded taxonomy scaffolding complete.
- Remaining: policy engine, scheduler, runtime receipt wiring, observability and replay tooling.


## Governance foundation (May 2026)
Implemented deterministic policy, classification, and scheduler planning primitives. Runtime routing remains intentionally unchanged; full enforcement and receipt wiring are follow-up work.

- Runtime policy/receipt integration in safe seams delivered; broad runtime governance and scheduler handoff remain planned future work.

- Operational intelligence substrate phase started: supervised operational memory + replay/observability scaffolding implemented; worker/device orchestration adapters remain planned.

## 2026-05-09 adapter/dry-run update
Worker/provider adapter contracts and scheduler-to-provider dry-run bridge are implemented for diagnostics and receipt/event emission only. Live provider routing is unchanged. Remote execution, Dynamo adapters, and GPU telemetry remain planned future work.

## 2026-05-09 governed routing update
Opt-in governed provider routing is available behind `NEMOCLAW_GOVERNED_ROUTING=1` (default off). Default routing is preserved when disabled. Remote worker execution, Dynamo orchestration, and GPU telemetry adapters are not implemented in this phase.


## 2026-05-09 local probe hardening update
This phase adds explicit manual local probe execution and diagnostics summaries, with deterministic degraded-state/event reporting. Remote execution, autonomous routing, and Dynamo integration remain planned future work.

## 2026-05-09 guarded remote probe seam update
- Added authenticated remote HTTP health-check probe seam with strict endpoint validation and timeout bounds.
- Added SSH remote probe placeholder status (`not_implemented`) without shell execution.
- Added remote probe receipt/event/registry integration seams; governed routing and remote execution remain unchanged/off.

## 2026-05-09 guarded remote execution seam update
- Added deny-by-default remote execution scaffold behind explicit opt-in flag.
- Implemented policy/approval-gated HTTP transport seam with redaction and degraded truth reporting.
- Explicitly out of scope: SSH command execution, daemons, autonomous orchestration, Dynamo integration.

## 2026-05-09 heterogeneous routing update
- Default local/provider behavior remains unchanged unless heterogeneous routing is explicitly enabled.
- Heterogeneous routing is opt-in via `NEMOCLAW_HETEROGENEOUS_ROUTING=1` and does not imply remote execution enablement.
- Remote execution requires separate `NEMOCLAW_REMOTE_EXECUTION=1` and policy eligibility.
- Remote candidates are excluded when policy denies or requires unprovided approval.
- Probe execution is explicit/manual with no background polling; remote execution and automated routing remain planned future work.
- Telemetry confidence and degraded states reflect observed registry/probe data only.

- [x] Integrate heterogeneous bridge at runtime/provider dispatch seam with strict flag gating and explicit blocked/degraded outcomes (2026-05-09).


## 2026-05-09 telemetry truth update
- Telemetry is explicit probe-only and best effort.
- Unavailable telemetry is acceptable and non-fatal.
- No background polling daemons are introduced.
- Telemetry is observed only through explicit probes; future scheduling use is planned and remains unavailable unless observed.
- Routing defaults remain unchanged; telemetry is non-authoritative metadata.

- Remote telemetry enrichment is evidence-only, with parser-specific metadata extraction and explicit persistence policy.
- No automatic optimization, autonomous routing, background telemetry polling, Dynamo orchestration, or GPU balancing in this phase.
## 2026-05-09 telemetry operational taxonomy hardening
- Added dedicated telemetry operational event kinds for probe lifecycle, parser outcomes, availability/staleness/conflict signals, and registry update decisions.
- Event payloads carry runtime/source attribution, confidence, and degraded reason codes while avoiding secret-bearing fields.
- Legacy consumers that read `degraded_state` / `runtime_action` continue to function; telemetry adds explicit categories for higher-fidelity replay and observability.

## Degraded-state hardening checkpoint (2026-05-09)
- Added deterministic chaos verification for governed routing, remote execution, probe telemetry truth, replay integrity, and diagnostics reason-code surfacing.
- Next orchestration increments must keep no-hidden-fallback guarantees and explicit degraded propagation semantics.

## Worker trust and attestation constraints (2026-05-09)
- Self-reported claims are evidence only and are **not automatically trusted**.
- Probe-observed evidence improves visibility but is **not authorization**.
- Operator approval is explicit and required before remote trust elevation.
- Revoked, expired, or conflict-detected workers are blocked/degraded for remote execution paths.
- Cryptographic attestation is not implemented yet in this phase.
- Remote execution is disabled by default and requires explicit opt-in flags.
- No orchestration/Dynamo integration is implemented in this phase.


## Residual matrix closure update (2026-05-09)
Closure pass completed for direct branch assertions and docs/status coherence. No new runtime behavior was introduced; work was limited to replay/observability/trust-policy-fallback verification hardening and claim hygiene.

## Security transport/redaction policy update (2026-05-09)
- Added deterministic security policy contracts for network, transport, command execution, secret redaction, and proofpack/export safety.
- Remote probes and the guarded remote execution seam now reject blocked transport before fetch or remote transport invocation.
- Operational event payloads, diagnostics, receipts, telemetry metadata, and proofpack/export-shaped payloads share redaction helpers.
- Command safety remains descriptor-only and does not introduce arbitrary command execution.
- Explicitly out of scope: orchestration, queues, daemons, retries, GPU balancing, Dynamo integration, autonomous behavior, and default remote execution.

## Forward milestone roadmap (next 5-10 releases, proposed on 2026-05-20)

This roadmap is grounded in current repository truth (opt-in governed/heterogeneous routing, explicit degraded-state semantics, deterministic verification expectations) and prioritizes contract safety over feature theatre.

### Release M1 — Canonical event-fabric contract lock + drift gate
- Goal: eliminate schema drift between runtime receipts, telemetry events, diagnostics exports, and docs references.
- Scope:
  - Introduce single-source event schema package under canonical ownership boundary (`core/event-fabric` mapping in repo layout).
  - Add CI drift check to fail when emitted runtime payload fields diverge from contract.
  - Add migration notes for existing event consumers.
- Why now: current roadmap/history shows many event additions; lock-in prevents silent divergence.
- Proofpack expectations:
  - deterministic schema compatibility test;
  - fixture replay proving stable event IDs and required degraded markers.

### Release M2 — Policy explainability and operator approval UX hardening
- Goal: make every deny/degraded decision human-auditable without exposing secrets.
- Scope:
  - Structured policy-decision reason tree (rule id, input class, redacted evidence source, remediation hint).
  - CLI/operator output upgrades for approval-required paths with clear next actions.
  - Explicit unsupported-path messaging for missing approvals or unsupported transports.
- Why now: fail-closed behavior is implemented, but operator ergonomics can still block safe adoption.
- Proofpack expectations:
  - golden tests for reason-code determinism;
  - integration tests for approval-required, denied, and recovered transitions.

### Release M3 — Replayability v2 (contract-level deterministic incident reconstruction)
- Goal: enable one-command deterministic reconstruction of control-plane decisions for support and audit.
- Scope:
  - Replay bundle index format (commands, environment toggles, fixture pointers, expected outcomes).
  - Validation command that compares replayed outputs vs committed baseline.
  - Degraded-path replay scenarios as first-class acceptance criteria.
- Why now: architecture docs require replay truth; formal tooling converts this into day-2 operational leverage.
- Proofpack expectations:
  - replay pass/fail snapshots;
  - deterministic hash/signature of replay artifacts.

### Release M4 — Runtime/policy boundary hardening for remote execution seam
- Goal: close fragile security seam where runtime dispatch, egress policy, and trust state intersect.
- Scope:
  - Mandatory preflight boundary checks consolidated into one typed guard.
  - Reject-on-ambiguity for conflicting trust signals (expired/revoked/conflicting probe results).
  - Add deny telemetry with explicit cause class, never mapped to healthy.
- Why now: AGENTS + architecture docs identify this as fragile/high-risk.
- Proofpack expectations:
  - adversarial tests for SSRF-like endpoint abuse attempts;
  - trust-conflict chaos fixtures proving fail-closed outcomes.

### Release M5 — Worker identity trust phase 1 (cryptographic attestation scaffold)
- Goal: move from evidence-only worker claims to verifiable trust anchors.
- Scope:
  - Pluggable attestation verifier interface (no silent fallback to self-asserted trust).
  - Signed worker identity metadata ingestion and expiry handling.
  - Policy hooks to require attestation for selected classes of remote execution.
- Why now: current docs explicitly state attestation is not implemented; this is the highest trust multiplier.
- Proofpack expectations:
  - attestation success/failure fixtures;
  - policy-gated routing tests demonstrating blocked execution without valid attestation.

### Release M6 — Device/telemetry confidence model + staleness SLOs
- Goal: convert probe telemetry from descriptive metadata into reliable scheduling inputs with explicit confidence semantics.
- Scope:
  - Confidence scoring contract (observed freshness, source type, parse quality, conflict state).
  - Staleness thresholds with deterministic degraded-state transitions.
  - Operator-visible telemetry quality diagnostics and remediation guidance.
- Why now: enables safe evolution toward smarter routing without fake confidence.
- Proofpack expectations:
  - property tests for confidence monotonicity and staleness transitions;
  - fixtures for conflicting telemetry sources.

### Release M7 — Deterministic scheduler GA (opt-in to default-ready)
- Goal: graduate scheduler from scaffolded/opt-in behavior to release-grade deterministic selection engine.
- Scope:
  - Stable tie-breaker hierarchy with explicit reject reasons.
  - Dry-run vs live-run parity checks.
  - Contract tests across local-only, heterogeneous, and policy-constrained candidate sets.
- Why now: depends on M2/M4/M6 trust and explainability work to avoid unsafe automation.
- Proofpack expectations:
  - reproducibility test matrix across seeded candidate pools;
  - regression corpus for prior routing incidents.

### Release M8 — OperatorGraph UX: truthful status matrix + degraded recovery workflows
- Goal: improve operator UX without compromising truthfulness.
- Scope:
  - Unified status panel for healthy/degraded/unknown with provenance badges.
  - Guided recovery actions tied to concrete reason codes.
  - Accessibility pass for keyboard navigation and small-screen readability in operator surfaces.
- Why now: converts deep backend work into dependable day-to-day operator flow.
- Proofpack expectations:
  - integration snapshots for each status class;
  - accessibility checks and keyboard-path tests.

### Release M9 — RecallForge operational memory phase 1 (support-safe evidence recall)
- Goal: make historical decisions queryable for support and continuous improvement without policy auto-mutation.
- Scope:
  - Append-only evidence index keyed by receipt IDs and decision contexts.
  - Query/filter tooling for “why was this blocked/degraded?” investigations.
  - Export-safe redaction guarantees for memory-backed support bundles.
- Why now: increases MTTR reduction and enables trust-preserving product analytics.
- Proofpack expectations:
  - append-only integrity tests;
  - provenance chain verification across receipt → event → memory entry.

### Release M10 — Release engineering and CI integrity ratchet
- Goal: enforce deterministic, fail-closed release posture at scale.
- Scope:
  - Unified release-readiness gate command that runs type/lint/test/replay/proofpack checks.
  - Contract-change checklist automation (docs delta required when behavior contracts change).
  - Flake detection/reporting with deterministic quarantine workflow.
- Why now: prevents roadmap progress from eroding integrity as system complexity rises.
- Proofpack expectations:
  - end-to-end release gate run artifact;
  - evidence bundle proving fail-closed behavior on injected regressions.

## Cross-cutting sequencing and dependency strategy

1. **Trust and contract integrity first (M1–M4)** before enabling more automation.
2. **Cryptographic and telemetry confidence substrate (M5–M6)** before scheduler GA.
3. **Operator and memory compounding value (M8–M9)** once truth contracts are hardened.
4. **CI/release ratchet (M10)** to sustain quality as new features ship.

## Suggested milestone cadence
- 2-3 week cycles per milestone with explicit go/no-go gates.
- Each milestone must ship with a deterministic proofpack and at least one degraded-path verification artifact.
- No milestone should claim “healthy” improvements without source-backed observability or explicit unknown/degraded semantics.
