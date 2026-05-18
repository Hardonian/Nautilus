<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Hardening Audit

Date: 2026-05-18

## Hardening status matrix

| Control | Status | Notes |
|---|---|---|
| Schema validation | Partial | Present in multiple paths, not fully unified. |
| Version migrations | Partial | Some versioned contracts exist; migration playbooks incomplete. |
| Retry policies | Partial | Present for some adapters, not globally standardized. |
| Timeouts | Partial | Not all hot path calls have explicit timeout budgets. |
| Circuit breakers | Limited | Not broadly applied to runtime/retrieval/persistence seams. |
| Idempotency keys | Partial | Needed for repeated write paths and retries. |
| Bounded queues | Limited | In-memory paths can grow without consistent global caps. |
| Retention policies | Partial | Retention semantics exist in docs/intent; implementation depth varies. |
| Error classification | Partial | Some structured enums/tests exist; not complete across pillars. |
| Degraded-state handling | Strong but incomplete | Explicit in major flows, missing in some distributed seams. |
| Fail-closed defaults | Strong in policy paths | Must be extended to all high-risk remote actions. |
| Smoke scripts | Partial | Scripts exist; complete release smoke chain should be expanded. |
| CI gates | Strong baseline | Needs additional lineage and replay continuity gates. |

## High-impact hardening gaps

1. **Contract centralization gap** (P0): duplicated event schemas.
2. **Persistence truth gap** (P0): in-memory lineage breaks after restart.
3. **Distributed fail-closed gap** (P0): edge/offline states need stricter deny defaults.
4. **Queue/timeout gap** (P1): partial coverage can create latent stalls.
5. **Replay evidence gap** (P1): proofpack must always declare missing segments explicitly.

## Recommended hardening sequence

1. Canonical event schema unification + migration adapter.
2. Durable trace/event/memory append-only store interface with strict write receipts.
3. Global timeout + retry + classification middleware for runtime/retrieval adapters.
4. Fail-closed distributed policy layer with explicit approval lineage.
5. CI lineage-gate tests (event→trace→memory→proofpack continuity assertions).
