<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus replay engine

## Implemented

- `core/event-fabric/replay.ts` provides deterministic in-process replay assembly for ordered event segments.
- Replay input includes a sequence number. Duplicate sequence numbers are ignored after the first accepted event and recorded in the replay result.
- Replay output includes `complete`, `partial`, or `degraded` status, explicit gap numbers, duplicate identifiers, notes, and a SHA-256 integrity hash for the accepted ordered event stream.
- Missing event segments and traces without terminal events remain visible as partial replay results. The implementation does not synthesize successful completion.

## Scaffolded

- Replay is an in-memory primitive for tests, local smoke validation, and platform contract hardening.
- The primitive does not yet own durable storage, distributed cursor management, or cross-process locks.

## Planned

- Durable replay journals under the event-fabric boundary.
- Cross-node replay cursor reconciliation.
- Operator-facing replay diff output for partial and degraded runs.

## Degraded behavior

- Missing sequence numbers produce `partial` replay with explicit `gaps`.
- Duplicate sequence numbers produce `degraded` replay when the stream is otherwise terminal and continuous.
- Interrupted traces without terminal events produce `partial` replay and include `interrupted_trace_without_terminal_event` in notes.

## Proofpack implications

- Proofpacks should reference replay integrity hashes instead of raw assertions when possible.
- Partial replay is acceptable evidence only when marked partial; it must not promote an interrupted execution to a successful one.

## Known limitations

- Integrity hashing is deterministic for the accepted in-memory event stream, not a durable tamper-evident ledger.
- There is no production replay API or UI in this change.
