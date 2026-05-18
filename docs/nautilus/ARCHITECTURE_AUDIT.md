<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Architecture Audit (Execution Truth)

## Scope and method
- Audited implementation against repository claims across README, `docs/nautilus/*`, and core/runtime modules.
- Classified each pillar as: implemented, partial, scaffold-only, or unavailable/degraded.

## Pillar coherence summary

| Pillar | Truth status | Findings |
|---|---|---|
| Event Fabric | **Partial** | Canonical contracts and local emission are implemented; no durable transport, retention, or migration strategy yet. |
| RecallForge | **Partial** | Provenance-aware memory/intelligence seams exist; persistence and long-horizon retention governance are incomplete. |
| OperatorGraph | **Partial** | Trace/replay correlation and operator views exist; replay completeness depends on in-memory adapters in current topology. |
| ThreatMesh | **Partial+Fail-Closed Core** | Fail-closed deny path is implemented for policy unavailability; broader policy-pack depth and distributed approvals need expansion. |
| MeshRAG | **Partial** | Explicit retrieval states and trust-oriented contracts exist; graph-hop lineage and durable retrieval replay are incomplete. |
| Runtime (NemoClaw) | **Implemented Core, Partial Federation** | Deterministic orchestration surfaces are present; distributed mesh execution and deep adapter matrix remain foundational. |

## Implementation truth corrections applied
- Marked full-fidelity distributed replay/provenance as **not yet complete**.
- Marked durable evidence storage as **degraded/unavailable** where only local/in-memory seams exist.
- Marked MeshRAG graph/retrieval federation claims as **foundational only**, not production-federated.

## Architecture drift and consolidation opportunities
1. Avoid duplicate contract naming between docs and code by treating `core/event-fabric/contracts.ts` as canonical source.
2. Keep policy lineage fields mandatory in operator-proof pathways; reject “best-effort” posture for high-risk operations.
3. Consolidate replay lineage across truth-loop → proofpack → operator reporting with one canonical replay reference key.
4. Keep degraded state taxonomy explicit (`unavailable`, `degraded`, `denied`) across all pillars.

## Residual risks
- In-memory-first adapters can hide continuity gaps under restart conditions.
- Replay lineage across distributed/offline nodes is not production-complete.
- Event growth/retention policies are not yet uniformly enforced.
