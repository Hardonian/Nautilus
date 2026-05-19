<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus topology model

## Implemented

- `core/operatorgraph/topology.ts` classifies nodes as `current`, `stale`, or `unavailable` from `lastSeenAt` timestamps.
- Nodes without a timestamp are unavailable.
- Nodes older than the caller-provided staleness window are stale.

## Scaffolded

- The topology model is a deterministic classification primitive.
- Dependency lists are retained on the input shape but no graph traversal, blast-radius scoring, or scheduling decisions are implemented here.

## Planned

- Dependency-aware health rollups.
- Runtime topology snapshots tied to execution replay.
- Operator views that separate current topology from stale topology.

## Degraded behavior

- Stale nodes remain visible and are not silently removed.
- Missing node heartbeat data becomes unavailable, not current.

## Replay implications

- Topology classification should be captured with the timestamp used for staleness evaluation so replay can explain why a node was stale at decision time.

## Proofpack implications

- Proofpacks that include topology evidence should include the node timestamp and staleness threshold used for the decision.

## Known limitations

- No distributed topology discovery is implemented.
- No production scheduler consumes these classifications yet.
