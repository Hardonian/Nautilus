<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Architecture & Implementation Truth Audit

Date: 2026-05-18
Branch audited: `program/nautilus-omega`

## Executive outcome

This repository has a real, test-backed Nautilus substrate with deterministic truth-loop foundations, but it is still **M1/M2 maturity** in several pillar areas. Core truth is implemented; many distributed/production claims remain scaffold-level and must stay explicitly degraded.

## Pillar-by-pillar truth classification

| Pillar | Truth status | Evidence summary |
|---|---|---|
| Nautilus identity coherence | **Implemented** | Root docs and AGENTS.md consistently define Nautilus as platform identity and NemoClaw as runtime engine. |
| NemoClaw runtime integrity | **Implemented (local), partial (remote)** | Runtime contracts and adapters exist with tests, but remote/distributed execution is still seam-first. |
| Event Fabric integrity | **Partial with contract drift** | Two event contracts exist (`core/event-fabric/contracts.ts` and `src/lib/core/nautilus-event-fabric.ts`) with schema/enum mismatches. |
| RecallForge provenance integrity | **Partial** | Memory/provenance wiring exists in truth loop; durable store/retention/migration paths are not complete. |
| OperatorGraph replay integrity | **Partial** | Trace/replay scaffolding exists, but durability/lineage completeness across all paths is not yet guaranteed. |
| ThreatMesh fail-closed integrity | **Implemented for key deny paths; partial overall** | Fail-closed semantics exist, but policy-pack lineage and full approval chain persistence remain incomplete. |
| MeshRAG lineage integrity | **Partial** | Retrieval interfaces and degraded states are explicit; trust scoring/replay lineage depth is limited. |
| Runtime topology integrity | **Partial** | Local runtime intelligence and adapter seams exist; topology snapshots/distributed fidelity are limited. |
| Distributed mesh trust boundaries | **Scaffolded** | Edge mesh primitives exist; production federation controls and offline replay guarantees are not complete. |
| Proofpack completeness | **Partial** | Proofpack generation/validation exists; complete cross-pillar evidence continuity is not universal. |

## Critical architecture findings

1. **Canonical event drift exists now** and is the largest integrity risk.
   - `core/event-fabric/contracts.ts` and `src/lib/core/nautilus-event-fabric.ts` disagree on type set, severity vocabulary, and envelope shape.
2. **Durability boundaries are inconsistent**: many flows are in-memory first, with explicit degraded states (good), but docs can still be read as stronger persistence guarantees than currently implemented.
3. **Distributed claims must remain marked as non-production** until trust boundaries, replay continuity, and remote policy governance are uniformly persisted and tested.

## Safe corrections completed in this audit pass

- Added release-truth audit artifacts (this file and companion docs) to remove ambiguity and codify what is implemented vs scaffolded.
- Added prioritized top-50 execution TODO backlog with concrete repo-grounded actions.

## Not safely auto-fixed in this pass

- Event contract unification (requires compatibility migration and broad test updates).
- Full end-to-end durable lineage (event↔trace↔memory↔proofpack) across every execution mode.
- Distributed edge-mesh production hardening and trust boundary enforcement.

## Release truth doctrine (must hold)

- No docs should imply production-grade distributed orchestration today.
- All degraded/unavailable states must remain explicit and operator-visible.
- Policy failures for high-risk operations must fail closed.
