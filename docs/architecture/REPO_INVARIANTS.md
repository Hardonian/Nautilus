<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Repository Invariants (Normative)

## Scope

This document defines non-negotiable invariants for implementation, review, CI, and release work in this repository.

## 1. No-theatre doctrine

- No placeholder completion claims.
- No “green-looking” outputs that hide failures.
- No invented confidence, metrics, or telemetry.
- All operator claims must be evidence-backed.

## 2. Deterministic proofpack rules

A proofpack is required for non-trivial behavior changes and must include:

1. deterministic command set,
2. observed outputs/outcomes,
3. artifact links or paths where applicable,
4. explicit degraded/unsupported coverage when relevant.

If a claim cannot be proven deterministically, it is not release-grade.

## 3. Degraded-state semantics

- Degraded states are first-class outcomes.
- They must be distinguishable from success via contract shape and operator messaging.
- Degraded reporting cannot invent unavailable data.

## 4. No fake telemetry

- Telemetry must originate from real runtime sources.
- Missing sources yield explicit unknown/degraded state.
- Derived values must preserve provenance and confidence boundaries.

## 5. Canonical contracts

- The event contract boundary is `core/event-fabric`.
- New contracts must attach to canonical pillar boundaries rather than ad hoc locations.
- Avoid duplicate schema/contract definitions.

## 6. TypeScript invariants

- Core behavior is implemented in TypeScript, not hidden in launcher glue.
- Runtime-affecting changes require type-safe interfaces and tests.
- CJS compatibility code in `bin/` must stay thin and non-authoritative.

## 7. CI invariants

- CI is fail-closed for lint/type/test regressions.
- Hooks and checks are part of product integrity, not optional process.
- Coverage ratchets are contractual and must not be weakened without explicit maintainer decision.

## 8. Fixture philosophy

- Fixtures should isolate one contract invariant whenever possible.
- Prefer semantically meaningful, minimal fixtures over broad brittle snapshots.
- Fixtures must not encode impossible/fake runtime states.

## 9. Replay guarantees

- Given same committed inputs and command sequence, contract-level results should replay deterministically.
- Non-determinism requires explicit containment, labeling, and acceptance criteria.

## 10. Unsupported-feature policy

- Unsupported behavior must be explicit in docs and UX surfaces.
- Do not imply roadmap commitments in normative architecture docs.
- Partial support must enumerate excluded paths.

## 11. Safe extension points

- Extend existing modules before introducing parallel systems.
- Add tests in the nearest owning project (`test/` for CLI integration, co-located plugin tests for `nemoclaw/src/`).
- Keep policy changes under blueprint ownership.

## 12. Anti-patterns

- Dashboard theater and cosmetic health indicators.
- Hidden fallback that mutates policy/security posture.
- Duplicate event/control-plane contracts.
- “Refactor first, verify later” behavior on critical paths.

## 13. Known fragile areas

- SSRF and sandbox policy enforcement paths.
- Cross-boundary state synchronization between runtime and blueprint policy.
- Any flow that reports health/confidence without direct source attribution.

## 14. Release verification expectations

- Release candidates must include deterministic proofpack evidence.
- Verify degraded-state behavior explicitly when touched.
- Block release on unresolved invariant violations.
- See `RELEASE_INVARIANTS.md` for the full release contract.

## 15. Testing invariants

- Tests must not depend on global mutable state from other tests.
- Fixtures must have `"fixture": true` and `"deterministicSample": true`.
- No UUID v4, random timestamps, or machine-specific paths in fixtures.
- See `TESTING_INVARIANTS.md` for the full testing contract.
