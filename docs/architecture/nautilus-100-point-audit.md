<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus 100-Point Audit: Threat + Stakeholder Analysis

Date: 2026-05-24

## Scope and method

This audit scores repository reality (code, tests, docs, and verification surfaces) across 10 weighted categories totaling 100 points. It follows the no-theatre doctrine: every claim maps to visible repository evidence.

### Evidence commands

```bash
rg --files -g 'AGENTS.md'
cat AGENTS.md
cat docs/architecture/REPO_INVARIANTS.md
cat docs/architecture/NAUTILUS_TRUTHS.md
cat docs/architecture/CONTROL_PLANE_BOUNDARIES.md
cat package.json
cat docs/architecture/current-state.md
cat docs/architecture/target-state.md
cat docs/verification/release-readiness.md
rg -n "threat|degraded|proofpack|replay|policy|verify:" docs src nemoclaw scripts package.json
```

## Executive scorecard (100 points)

| Category | Weight | Score | Why |
|---|---:|---:|---|
| 1) Contract and boundary integrity | 10 | 8 | Strong normative architecture docs and boundary language exist; some docs still describe planned gaps that appear partially implemented in code paths under `src/lib/control-plane/`. |
| 2) Security and threat controls | 15 | 11 | Threat models and security docs are extensive; residual risk remains around known fragile SSRF/policy seams and potential drift between docs and implementation surfaces. |
| 3) Degraded-state truthfulness | 10 | 8 | Degraded semantics are explicit in architecture doctrine and tests mention degraded chaos; taxonomy standardization appears in progress and not universally enforced yet. |
| 4) Replayability, evidence, and auditability | 10 | 8 | Proofpack/replay scripts and release-readiness checks are present; cross-surface evidence stitching still requires stronger single-pane reporting. |
| 5) Verification rigor and CI fail-closed behavior | 10 | 9 | Rich verify/review script matrix and deterministic language are present in package scripts and docs. |
| 6) Runtime/control-plane coherence | 10 | 7 | Clear intended separation exists; current-state docs and target-state docs lag parts of existing control-plane implementation files, creating operator-truth tension. |
| 7) Documentation truth and operator clarity | 10 | 7 | Strong doctrine docs exist; current-state/target-state language needs refresh to avoid under/over-claiming relative to repo reality. |
| 8) Stakeholder workflow fitness | 10 | 7 | Maintainer and user skill surfaces are rich; high signal but fragmented across many docs/skills, increasing cognitive load. |
| 9) Maintainability and change safety | 10 | 8 | Tests are broad and architecture boundaries are explicit; seam-heavy areas (CLI/plugin/CJS boundary) remain fragile by admission. |
| 10) Product trust and release readiness | 5 | 4 | Release-readiness guardrails are explicit and truthful; residual risk is documentation/claim drift reappearing in future PRs. |
| **Total** | **100** | **77** | **Good foundation with high trust intent; highest leverage is coherence hardening and threat-seam validation depth.** |

## Threat analysis (priority ordered)

### T1: Contract drift between docs and implemented control-plane surfaces
- **Risk:** Medium-High (trust and operator decision quality).
- **Evidence:** `current-state.md` and `target-state.md` still describe several control-plane elements as planned/partial while `src/lib/control-plane/` contains substantial implementation and tests.
- **Impact:** Operators may under-trust real controls or over-trust intended ones depending on which doc they read.
- **Priority fixes:**
  1. Add a generated “status truth map” from code/test artifacts into docs.
  2. Gate release on docs-vs-code status consistency check.

### T2: Security-sensitive seam fragility (runtime/policy/egress)
- **Risk:** High (policy bypass or incorrect deny/allow behavior).
- **Evidence:** AGENTS and architecture docs explicitly mark blueprint/policy/SSRF pathways as fragile.
- **Impact:** Silent posture weakening or false healthy states.
- **Priority fixes:**
  1. Expand deterministic adversarial tests for egress + SSRF combinations.
  2. Add explicit failure-class receipts for policy-evaluation ambiguity.

### T3: Evidence fragmentation across verification commands
- **Risk:** Medium (slow incident triage, weak audit usability).
- **Evidence:** Many verification scripts exist (`verify:*`, `review:*`) but no single normalized score/risk artifact is obvious at root.
- **Impact:** Stakeholders struggle to interpret release truth quickly.
- **Priority fixes:**
  1. Add one aggregate “governance scoreboard” artifact with category pass/fail and links.
  2. Include degraded-behavior evidence summary by default.

### T4: Cross-boundary TS/CJS seam regressions
- **Risk:** Medium (launch/runtime mismatch).
- **Evidence:** Explicitly listed fragile area; launcher CJS and TS runtime coexist.
- **Impact:** Production behavior differs from tested TS paths.
- **Priority fixes:**
  1. Add seam contract tests that execute installed bins and assert parity with TS behavior.

### T5: Skill/document sprawl for users/operators
- **Risk:** Medium-Low (adoption and support burden).
- **Evidence:** Large skill catalog and docs breadth are valuable but dense.
- **Impact:** Slower onboarding, inconsistent operational patterns.
- **Priority fixes:**
  1. Curate “top 10 operational playbooks” with strict decision trees.

## Stakeholder analysis

| Stakeholder | What they need | Current strength | Current pain/risk | Recommended improvement |
|---|---|---|---|---|
| Maintainers/reviewers | deterministic merge confidence | Strong scripts + doctrine | dispersed verification outputs | Single merge-gate report artifact |
| Security/compliance | policy truth, audit lineage | threat docs + no-theatre rules | seam fragility acknowledged but not centrally risk-scored | Threat regression matrix in CI |
| Operators/SRE | honest degraded states, recovery guidance | explicit degraded policy language | status clarity varies by command path | standardized degraded cause taxonomy in all user-facing surfaces |
| Contributors | clear extension boundaries | canonical boundary docs | uncertain “implemented vs planned” status | generated component maturity table from tests |
| Product leadership | trustworthy roadmap/readiness | release-readiness doc exists | may not quickly quantify risk deltas | weekly 100-point trend report from CI artifacts |
| End users | reliable, transparent behavior | fail-closed orientation, safety posture | doc/skill volume can obscure first steps | simplified role-based quickstarts and support runbooks |

## 12 highest-leverage improvement areas

1. **Docs/code maturity sync gate** (auto-fail when planned/implemented status drifts).
2. **ThreatMesh seam test expansion** for SSRF + policy + egress edge cases.
3. **Unified degraded taxonomy contract** consumed by CLI/plugin/docs.
4. **Release evidence index artifact** with signed pointers to proofpack/replay/export checks.
5. **Bin-vs-TS parity tests** across `bin/` launchers and TS command paths.
6. **Policy decision receipt normalization** with machine-readable reject/degraded cause classes.
7. **Operator-facing recovery playbooks** keyed by degraded cause code.
8. **Cross-project version drift sentinel** for root + `nemoclaw/` + blueprint seams.
9. **Verification runtime budget split** (fast pre-merge vs exhaustive nightly) with deterministic labels.
10. **Stakeholder-specific dashboards** generated from existing verification outputs (no new telemetry theatre).
11. **Security boundary assertion tests** to prove no silent privilege broadening on fallback paths.
12. **Contribution path simplification** mapping common change types to exact required proof commands.

## Recommended execution plan

### Phase 1 (1-2 weeks): truth coherence
- Add docs/code status synchronizer and fail-closed check.
- Emit aggregate release evidence JSON for maintainers/operators.
- Standardize degraded cause code schema where already implemented.

### Phase 2 (2-4 weeks): threat seam hardening
- Expand SSRF/egress/policy adversarial fixtures.
- Add launcher parity tests and fallback posture assertions.
- Add threat-regression CI matrix and trend outputs.

### Phase 3 (ongoing): stakeholder UX
- Publish role-based runbooks and “first response” playbooks.
- Reduce documentation path length for common tasks.
- Track the 100-point score trend per release candidate.

## Exit criteria for “audit closed”

- Status truth in docs auto-derived or auto-validated against code/test evidence.
- Threat seam tests cover fragile areas with deterministic pass/fail artifacts.
- Degraded states are uniformly machine-readable and never reported as healthy.
- One command produces a stakeholder-readable governance summary artifact.
