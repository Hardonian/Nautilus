<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Agent Instructions

## Purpose

This file is operational memory for Codex/agent contributors. It is not a marketing page. Preserve real invariants, prove behavior with executable evidence, and refuse “looks-good” changes that weaken safety or truthfulness.

## No-theatre doctrine

- Do not claim behavior that is not implemented and verified.
- Do not fabricate health, confidence, completeness, telemetry, or incident status.
- Do not merge “placeholder architecture” that creates parallel truth paths.
- Prefer explicit degraded states over silent fallback.

## Canonical contracts and boundaries

Nautilus platform pillars are the canonical architecture boundaries:

- `core/runtime` (NemoClaw runtime boundary)
- `core/recallforge`
- `core/operatorgraph`
- `core/threatmesh`
- `core/meshrag`
- `core/event-fabric` (canonical event contract)

When adding features, extend existing boundary-owned contracts before introducing net-new abstractions.

## Deterministic proofpack rules

Every meaningful change must have deterministic proof artifacts (proofpack):

1. exact commands run,
2. pass/fail outcomes,
3. generated evidence tied to changed behavior,
4. degraded behavior evidence when applicable.

“Trust me” is not acceptable evidence.

## Degraded-state semantics

- Degraded state must be explicit, inspectable, and user-visible where relevant.
- Degraded must never be emitted as healthy/success.
- Recovery transitions must be auditable.

## TypeScript and CI invariants

- Keep runtime truth in TypeScript sources under `src/` and `nemoclaw/src/`; CJS in `bin/` remains launcher/compat only.
- Preserve strict compile/type boundaries (`tsconfig.cli.json`, `nemoclaw/tsconfig.json`).
- CI must remain deterministic and fail-closed for type errors, lint failures, and test regressions.
- Do not lower coverage thresholds or bypass hooks to land a change.

## Fixture philosophy and replay guarantees

- Fixtures are executable evidence, not decorative snapshots.
- Favor minimal fixtures that encode one invariant each.
- Replays should reproduce contract-level outcomes deterministically from committed inputs.

## Unsupported-feature policy

- If behavior is not supported, say so directly in docs and operator-facing output.
- Do not disguise unsupported features with partial emulation that appears complete.

## Safe extension points

Preferred extension points:

- CLI behavior: `src/lib/` (+ integration tests in `test/`)
- Plugin behavior: `nemoclaw/src/` (+ co-located tests)
- Blueprint/policy: `nemoclaw-blueprint/`
- User-facing docs: `docs/`

## Anti-patterns to reject

- Fake telemetry, fake confidence, synthetic “healthy” state.
- Silent fallback that changes security posture.
- Copy-paste contracts that diverge from canonical event/control contracts.
- Broad refactors that move boundaries without proving invariant preservation.

## Known fragile areas

- Security-sensitive runtime pathways in `nemoclaw/src/blueprint/` (state, SSRF, sandbox behavior).
- Policy/egress interactions under `nemoclaw-blueprint/policies/`.
- Cross-project TypeScript/CJS seams between root CLI, `nemoclaw/`, and `bin/` launcher.

## Required architecture memory

Read and follow:

- `docs/architecture/REPO_INVARIANTS.md`
- `docs/architecture/NAUTILUS_TRUTHS.md`
- `docs/architecture/CONTROL_PLANE_BOUNDARIES.md`
- `docs/architecture/TESTING_INVARIANTS.md`
- `docs/architecture/RELEASE_INVARIANTS.md`

These documents are normative for agent implementation behavior.

## Optional skill catalog pointers for coding assistants

For environments that support skill discovery through repository pointers, the project skill catalog lives at:

- `.agents/skills/` (canonical shared skill source)

Connector-specific optional pointers:

- Cursor: also supports project-level `.cursor/skills/`; this repository keeps the canonical skills in `.agents/skills/`.
- Claude Code: `.claude/skills/` is a symlink to `.agents/skills/` for Claude-native discovery.
- Other agentic IDEs/connectors: point project-level skill loading to `.agents/skills/` when supported.

This section is a discovery pointer only and does not change the operational invariants above.
