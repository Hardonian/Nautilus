<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus platform evolution: architecture truth and migration plan

## Architecture truth map (current repository)

- **NemoClaw runtime + CLI**: `src/lib/`, `bin/`, `scripts/`.
- **Plugin runtime + sandbox orchestration**: `nemoclaw/src/blueprint/`, `nemoclaw/src/commands/`, `nemoclaw/src/security/`, `nemoclaw/src/onboard/`.
- **Operator-facing visibility**: `operator-console/src/routes/` and `operator-console/src/components/`.
- **Policy and topology artifacts**: `nemoclaw-blueprint/` and `nemoclaw-blueprint/policies/`.
- **Verification gates**: `scripts/verify-core.js`, `scripts/checks/run.ts`, `vitest.config.ts`, root and plugin test trees.

## Capability matrix (implemented vs scaffolded)

### Implemented in code today

- Deterministic verification gating and explicit PASS/WARN/FAIL semantics.
- Security primitives including SSRF validation and secret scanning.
- Sandbox orchestration and plugin-runner workflows.
- Operator console surfaces for telemetry, degraded states, replay validation, trust attestation, diagnostics, and receipts.

### Scaffolded now in this change

- Canonical cross-pillar event contract at `core/event-fabric/contracts.ts`.
- Canonical pillar boundaries:
  - `core/runtime/`
  - `core/recallforge/`
  - `core/operatorgraph/`
  - `core/threatmesh/`
  - `core/meshrag/`

### Not implemented (still future work)

- Fully distributed execution control plane.
- Autonomous self-healing loops.
- Device-level GPU balancing orchestrator.
- Fully materialized retrieval mesh with vector placement engine.

## Implementation-vs-doc drift findings addressed

- Repository identity was fork-centric and not framed as a stable platform architecture.
- Pillar boundaries were implied in scattered docs but lacked canonical filesystem anchors.
- Event semantics existed across modules but lacked a single typed truth contract.

## Consolidation strategy

1. Keep NemoClaw as runtime/orchestration engine.
2. Introduce Nautilus as platform identity around existing proven runtime truth.
3. Migrate capability-by-capability into `core/*` contracts before moving implementations.
4. Preserve explicit degraded-state semantics and verification-first doctrine.

## Canonical terminology

- Platform: **Nautilus**
- Runtime engine: **NemoClaw Runtime**
- Operator UI: **Operator Console**
- Cross-pillar event system: **Canonical Event Fabric**

Deprecated ambiguous language: dashboard, AI hub, command center, cockpit.

## Next milestone execution plan

1. Wire canonical event contract emitters in runtime and operator console adapters.
2. Add ThreatMesh policy decision envelope to existing policy checks.
3. Add RecallForge lineage persistence format for receipts + degraded transitions.
4. Add OperatorGraph replay graph adapter from existing replay/diagnostic events.
5. Add MeshRAG retrieval provenance envelope and trust score schema.


## M1 truth loop checkpoint (2026-05-18)

### Implemented now
- `src/lib/core/nautilus-truth-loop.ts` orchestrates a minimal Event → Policy → Retrieval → Runtime → Memory report loop.
- Fail-closed deny is enforced when policy engine is missing.
- Retrieval unavailability is explicit and degraded, never fabricated.
- Runtime failure emits `execution.failed` with preserved execution/correlation context.
- RecallForge provenance is required for stored completion memory records.

### Scaffolded
- In-memory adapters for event bus, trace writer, and memory writer are canonical seam defaults.

### Degraded/unavailable
- Missing trace store and memory store are reported as degraded states in the final operator report.

### Planned later
- Durable storage adapters and production telemetry/runtime health integration beyond in-memory seam coverage.

## M2 truth lineage + edge federation checkpoint (2026-05-18)

### Implemented now
- `src/lib/core/proofpacks.ts` generates replayable proofpacks from execution event lineage, policy lineage, retrieval lineage, trace lineage, and memory references.
- `runTruthLoop` now emits proofpack artifacts for both completion and failure paths via an injectable `proofpackSink`.
- `src/lib/core/edge-mesh.ts` introduces deterministic edge federation contracts for node registration, stale/offline detection, and fail-closed remote execution approval.

### Explicit fail-closed/degraded behavior
- Remote execution approvals deny by default for unavailable target nodes, untrusted boundaries, or missing operator approval.
- Federation snapshots report `online`/`degraded`/`offline` states with explicit degraded reasons (`offline_nodes_detected`, `untrusted_boundary_present`).

### Current scope limit
- Edge mesh contracts are currently in-process control-plane logic and not yet backed by distributed transport.
