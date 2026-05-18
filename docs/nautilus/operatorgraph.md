<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# operatorgraph

## Implemented now
- Operator console truth-surface builder for topology, timelines, replay references, retrieval lineage, policy evaluation, degraded states, runtime health, execution outcomes, and memory provenance references.
- Truthful state labeling across `ready`, `empty`, and `unavailable` states with deterministic explanation text.
- Replay and policy references surfaced as explicit operator artifacts without synthetic telemetry.

## Partial
- OperatorGraph projection includes policy decision references emitted by policy-pack evaluation artifacts.
- Trace rendering in this milestone is programmatic (typed console surface object) and not yet a standalone UI route.

## Scaffolded
- Durable trace persistence and distributed replay query APIs are not implemented in this change.

## Planned later
- Full operator console route and CLI output integration.
- Historical replay diffing across multiple executions.

## Known limitations
- No claim of live topology inference beyond provided runtime evidence.
- Unavailable traces are explicitly labeled unavailable; no inferred substitute graph is generated.

## Verification commands
- `npm test -- src/lib/core/nautilus-pillars.test.ts`
- `npm run typecheck:cli`
