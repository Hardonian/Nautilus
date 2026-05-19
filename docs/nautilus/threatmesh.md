<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# threatmesh

## Implemented now
- Policy pack primitives: `PolicyPack`, `ApprovalGate`, `PolicyDecision`, `TrustScore`, `RiskSignal`, `RuntimeRestriction`, `ToolPermission`, and `RetrievalPermission`.
- Canonical reusable packs: `local_dev_safe`, `operator_approval_required`, `retrieval_readonly`, and `high_risk_fail_closed`.
- Fail-closed behavior for high-risk operations, including deny on missing policy config for high-risk execution.
- Explainable denials and approval trace references in emitted policy events and lineage records.
- Unit tests covering fail-closed behavior, approval-required behavior, denial explanations, and lineage/event wiring.

## Partial
- Policy events are emitted to the local event fabric and projected into in-memory OperatorGraph/RecallForge adapters.
- Execution wiring currently targets core truth-loop/test seams, not all OpenShell production runtime entry points yet.

## Scaffolded
- Service boundaries remain interface-first for long-lived distributed policy storage and cross-node policy propagation.

## Planned later
- End-to-end runtime integration across every execution path in plugin command orchestration.
- Durable policy history storage and fleet-wide governance rollup.

## Known limitations
- No claim of autonomous approval handling or external policy control plane federation.
- Operator surfaces remain truthful typed summaries (including empty/degraded/unavailable labels), not synthetic dashboards.

## Verification commands
- `npm test -- src/lib/core/nautilus-pillars.test.ts`
- `npm run typecheck:cli`
