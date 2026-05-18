<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Hot Path Audit

Date: 2026-05-18

## Audited paths

1. execution planner / dispatch
2. runtime adapter probes and calls
3. event emission and validation
4. trace/memory write path
5. retrieval execution
6. policy evaluation
7. proofpack generation
8. operator reporting

## Highest-risk findings

### 1) Event serialization/validation duplication
- Risk: contract drift produces branching validation logic, replay mismatch, and potential silent drops in downstream consumers.
- Impact: high correctness risk, medium performance risk (duplicate transforms).
- Priority: **P0**.

### 2) In-memory-first lineage on key seams
- Risk: process restart loses continuity for trace/memory/event references.
- Impact: high auditability risk.
- Priority: **P0**.

### 3) Probe fanout/backpressure controls are incomplete
- Risk: runtime probe storms can increase latency or block operator/report paths in degraded environments.
- Impact: medium availability risk.
- Priority: **P1**.

### 4) Proofpack generation can re-walk repeated structures
- Risk: duplicate work on large runs.
- Impact: medium CPU/latency risk.
- Priority: **P1**.

## Blocking-call and resilience checklist

- Timeout coverage: partial.
- Retry policy consistency: partial.
- Cancellation propagation: partial.
- Queue bounds/backpressure: partial.
- Idempotency keys for repeated writes: partial.

## Safe improvements proposed

1. Single canonical event codec package with compatibility adapter.
2. Bounded async queues for event/trace/memory write fanout.
3. Proofpack incremental build mode keyed by executionId + span watermark.
4. Probe scheduler with jittered interval, max concurrency, and deadline budget.
5. Structured error taxonomy (`transient`, `policy_denied`, `unavailable`, `schema_violation`).

## Measurable targets

- Reduce duplicate event parsing/validation by >50% per run.
- Keep P95 planner+report path latency under controlled degraded test scenarios.
- Zero silent lineage gaps (all gaps explicit in output artifacts).
