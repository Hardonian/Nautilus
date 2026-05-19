<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Release Invariants (Normative)

## Scope

This document defines non-negotiable invariants for release preparation, verification, and publication in this repository.

## 1. Release verification expectations

- Release candidates must include deterministic proofpack evidence.
- `npm run verify:release` must pass without modification or skipping.
- Verify degraded-state behavior explicitly when touched.
- Block release on unresolved invariant violations.

## 2. Deterministic release truth

- Release readiness is demonstrated by deterministic proofpack outputs, not by manual assertion.
- All verification scripts must be wired in `package.json` and callable via `npm run`.
- Release artifacts must be reproducible from the same commit.

## 3. No-theatre doctrine in release

- No placeholder completion claims in release notes or verification summaries.
- No "green-looking" outputs that hide failures.
- No invented confidence, metrics, or telemetry in release artifacts.
- All operator claims must be evidence-backed.

## 4. Unsupported-feature policy in releases

- Unsupported behavior must be explicit in release docs and UX surfaces.
- Do not imply roadmap commitments in release notes.
- Partial support must enumerate excluded paths.
- "Not supported" is a valid release answer — do not imply support by returning simulated values.

## 5. CI invariants for release

- CI is fail-closed for lint/type/test regressions.
- Hooks and checks are part of product integrity, not optional process.
- Release verification must include deterministic proofpack evidence for changed behaviors.
- Fail release readiness when boundary ownership is violated or contract drift is unproven.

## 6. TypeScript invariants for release

- Core behavior is implemented in TypeScript, not hidden in launcher glue.
- Runtime-affecting changes require type-safe interfaces and tests.
- CJS compatibility code in `bin/` must stay thin and non-authoritative.
- All release-grade code must pass `tsc` without errors.

## 7. Degraded-state semantics in releases

- Degraded states are first-class release outcomes.
- They must be distinguishable from success via contract shape and operator messaging.
- Degraded reporting cannot invent unavailable data.
- Recovery transitions must be auditable.

## 8. Artifact integrity

- Release artifacts must include verification summary JSON.
- Release bundles must include all scripts referenced in `package.json`.
- Docker images must be built from pinned base images (no floating `latest` tags).
- Checksums must be published alongside binary artifacts.

## 9. Known fragile release zones

- SSRF and sandbox policy enforcement paths.
- Cross-boundary state synchronization between runtime and blueprint policy.
- Any flow that reports health/confidence without direct source attribution.
- Credential storage and migration paths.

## 10. Anti-patterns in release

- Dashboard theater and cosmetic health indicators in release verification.
- Hidden fallback that mutates policy/security posture.
- Duplicate event/control-plane contracts.
- "Refactor first, verify later" behavior on critical paths.
- Releasing without proofpack evidence for control-plane-affecting changes.
