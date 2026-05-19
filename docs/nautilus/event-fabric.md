<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# event-fabric

## Implemented now
- Typed contracts and in-memory scaffolding in `src/lib/core`.
- Unit tests covering contract validation and fail/degraded behavior.

## Intentionally scaffolded
- Service boundaries are interfaces; production persistence and distributed transport are not implemented in this change.

## Planned later
- Runtime integration into OpenShell lifecycle and plugin command surfaces.
- Durable storage adapters and dashboard/replay presentation layers.

## Known limitations
- No claim of live telemetry, full observability dashboard, or autonomous learning.
- Degraded/unavailable states are modeled by typed contracts and explicit denial/unknown fields.

## Verification commands
- `npm test -- src/lib/core/nautilus-pillars.test.ts`
- `npm run typecheck:cli`
