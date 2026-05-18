<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# EXECUTION_SURVIVABILITY

## Implemented
- Deterministic scaffold with explicit degraded-state behavior and replay-visible outcomes.
- Contracted behavior is covered with Vitest tests in `test/core`.

## Planned
- Durable multi-node persistence and cross-process recovery remain planned.

## Degraded behavior
- Unavailable components return explicit unavailable/degraded states, never synthetic healthy values.

## Replay implications
- Replay never mutates source evidence; missing segments are explicit.
