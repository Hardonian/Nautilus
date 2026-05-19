<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Control Plane Boundaries

## Objective

Define durable boundaries that prevent contract drift, fake observability, and unsafe extension.

## Canonical ownership map

- `core/runtime`: execution semantics, state progression, runtime safety decisions.
- `core/event-fabric`: canonical event schemas and lifecycle semantics.
- `core/threatmesh`: policy and threat-informed controls.
- `core/operatorgraph`: operator-facing workflow semantics.
- `core/recallforge`: memory/evidence recall semantics.
- `core/meshrag`: retrieval-augmented mesh concerns.

Implementation paths in this repo should map behavior to these owners, even during transition periods.

## Boundary invariants

1. **No parallel contracts**: a control/event semantic must have one canonical contract owner.
2. **No fake telemetry**: observability surfaces can only publish source-backed state.
3. **No silent privilege broadening**: degraded fallback cannot weaken policy posture.
4. **No hidden unsupported paths**: unsupported flows must be explicit at contract and docs layers.

## Safe extension points

- Add CLI control-plane behavior in `src/lib/` and validate through `test/` integration coverage.
- Add plugin control-plane behavior in `nemoclaw/src/` with co-located tests.
- Add policy-level control behavior in `nemoclaw-blueprint/` with policy-specific validation.

## Degraded-state contract guidance

- Degraded and unknown states are explicit contract outcomes.
- Include machine-readable markers for degraded outcomes.
- Do not collapse degraded into success for UX convenience.

## CI and release verification expectations

- Control-plane-affecting changes must preserve type and test guarantees.
- Release verification must include deterministic proofpack evidence for changed control-plane behaviors.
- Fail release readiness when boundary ownership is violated or contract drift is unproven.

## Known fragile areas

- Runtime/policy interaction seams (execution gating vs egress policy).
- Event shape drift across CLI/plugin/docs surfaces.
- State reporting paths that blend observed and inferred values without provenance.

## Anti-patterns

- Adding convenience adapters that redefine canonical event fields.
- Emitting “healthy” or “connected” without runtime-confirmed evidence.
- Shipping extension hooks that bypass policy or validation paths.
