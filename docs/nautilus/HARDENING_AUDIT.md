<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Hardening Audit

## Controls verified
- ThreatMesh fail-closed deny semantics on policy unavailability.
- Event-contract validation surfaces.
- Provenance-oriented memory/recommendation contracts.
- Replay/proofpack primitives with explicit degraded-state support.

## Gaps (explicit)
1. No end-to-end durable migration path for event/memory/trace stores.
2. Bounded queue semantics are not uniformly enforced across all high-volume paths.
3. Retry/timeout policy taxonomy is not centrally standardized for all adapters.
4. Distributed mesh trust/approval lineage is foundational rather than fully production-hardened.

## Required hardening backlog (priority)
1. Introduce mandatory idempotency keys for proofpack + lineage writes.
2. Add bounded retention and explicit eviction telemetry to event/memory adapters.
3. Standardize timeout/circuit-breaker/retry contracts per runtime adapter type.
4. Add CI gates that fail on unverifiable lineage claims in docs and proof outputs.
5. Expand fail-closed policy packs for high-risk remote execution pathways.
