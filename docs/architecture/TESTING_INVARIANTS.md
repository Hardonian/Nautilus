<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Testing Invariants (Normative)

## Scope

This document defines non-negotiable invariants for test authoring, execution, isolation, and coverage in this repository.

## 1. Test isolation expectations

- Tests must not depend on global mutable state from other tests.
- Tests must not depend on external services unless explicitly marked e2e/integration.
- Fixtures must be committed under `test/fixtures/` with `"fixture": true` and `"deterministicSample": true` markers.
- Tests must not write to directories outside the test sandbox or temp directory.

## 2. Fixture determinism

- Fixtures are executable evidence, not decorative snapshots.
- Every fixture must have `"fixture": true` and `"deterministicSample": true` at the top level.
- No UUID v4, random timestamps, or machine-specific paths in fixtures.
- Fixtures must isolate one contract invariant when possible.
- Fixtures must not encode impossible/fake runtime states.

## 3. Replay guarantees

- Given same committed inputs and command sequence, contract-level results should replay deterministically.
- Non-determinism requires explicit containment, labeling, and acceptance criteria.
- Replay smoke tests (`npm run nautilus:replay-smoke`) must pass before merge.

## 4. Proofpack semantics

- A proofpack is required for non-trivial behavior changes and must include:
  1. deterministic command set,
  2. observed outputs/outcomes,
  3. artifact links or paths where applicable,
  4. explicit degraded/unsupported coverage when relevant.
- If a claim cannot be proven deterministically, it is not release-grade.

## 5. Degraded-state semantics in tests

- Tests must verify degraded states explicitly when degraded paths are touched.
- Degraded must never be asserted as healthy/success.
- Tests must verify recovery transitions are auditable when recovery is touched.

## 6. Coverage invariants

- Do not lower coverage thresholds or bypass hooks to land a change.
- Do not use `/* istanbul ignore */` or equivalent without explicit maintainer review.
- Coverage ratchets are contractual and must not be weakened without explicit maintainer decision.

## 7. E2E test contracts

- E2E tests must use fake tokens for credential-based tests — never real secrets.
- E2E tests must be hermetic where possible (mock endpoints, local fixtures).
- E2E tests that require cloud access must be gated behind schedule/workflow_dispatch, never on PRs.
- E2E timeouts must be explicit and documented — no implicit infinite waits.

## 8. Unsupported-feature testing

- Tests for unsupported features must explicitly mark the limitation in the test name or skip reason.
- Do not fake-pass tests by returning simulated values for unsupported paths.
- "Not supported" is a valid test outcome when documented.

## 9. Known fragile test zones

- SSRF and sandbox policy enforcement test paths.
- Cross-boundary state synchronization tests (runtime ↔ blueprint policy).
- Any test that reports health/confidence without direct source attribution.
- Credential sanitization and secret redaction tests.

## 10. Anti-patterns in tests

- Tests that depend on execution order.
- Tests that silently skip assertions on failure.
- Tests that use `try/catch` to swallow failures without re-throwing.
- Tests that fabricate fixture data that contradicts documented contracts.
- Tests that verify "healthy" state without source-backed data.
