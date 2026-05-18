<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Hot Path Audit

## Hot paths reviewed
- Execution planning and queueing
- Runtime adapter dispatch
- Event emission and contract validation
- Trace/proofpack generation
- Memory/intelligence recording
- Policy evaluation and denial reporting

## Findings

### 1) Execution planner and runtime dispatch
- Deterministic plan wiring exists, but heterogeneous runtime calls can still accumulate serial latency under fan-out conditions.
- Recommendation: add bounded parallelism limits and per-adapter timeout metrics for operator visibility.

### 2) Event emission and validation
- Event envelopes and contract checks exist; backpressure and retention controls remain incomplete for high-volume paths.
- Recommendation: enforce bounded queue or drop-policy telemetry where persistent sinks are unavailable.

### 3) Trace + proofpack pipeline
- Replay artifacts are generated with lineage intent; missing upstream evidence currently propagates as partial proof material.
- Recommendation: enforce explicit `missing_evidence` blocks in every proofpack terminal section.

### 4) Memory and retrieval pathways
- RecallForge/MeshRAG correctly model degraded states instead of simulating success.
- Recommendation: add stricter performance SLO envelopes for retrieval timeout/cancellation and annotate operator reports.

## Highest-risk performance/hardening gaps
1. Unbounded growth risk when durable sinks are unavailable.
2. Incomplete timeout/cancellation consistency across all runtime adapters.
3. Potential N+1 lineage resolution patterns during proofpack assembly.
