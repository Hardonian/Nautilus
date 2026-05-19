<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus retention and archival

## Implemented

- `core/recallforge/retention.ts` classifies records as `retain_hot`, `move_warm`, `archive_cold`, or `retain_immutable`.
- Immutable evidence records are never downgraded by age-based archival classification.
- Age-based transitions are deterministic from caller-provided timestamps and thresholds.

## Scaffolded

- Retention classification is an in-memory policy primitive. It does not move files or delete records.
- Archival is represented as a disposition for callers to enact safely.

## Planned

- Durable storage lifecycle jobs.
- Archival manifests tied to replay and proofpack references.
- Operator dry-run and audit commands before destructive retention actions.

## Degraded behavior

- The primitive returns a disposition only. If storage movement fails, callers must preserve the original record and surface degraded storage state.
- Immutable evidence should remain retained until a production-grade evidence retention policy exists.

## Replay implications

- Retention decisions should be replay-visible with thresholds, timestamps, and record identifiers.
- Archive transitions must not remove evidence needed to verify existing proofpacks.

## Known limitations

- No deletion behavior is implemented.
- No storage backend adapter is implemented in this change.
