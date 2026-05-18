<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Top 50 TODOs

Priority ordered. Categories: **Maintenance**, **Leverage**, **Moat**.

1. **[Maintenance]** Unify `core/event-fabric/contracts.ts` and `src/lib/core/nautilus-event-fabric.ts` into one canonical schema.
2. **[Maintenance]** Add migration adapter for legacy event types (`memory.learned`-style drift).
3. **[Maintenance]** Add CI gate asserting zero event family/type mismatches.
4. **[Maintenance]** Add durable append-only event store adapter with deterministic write receipts.
5. **[Maintenance]** Add durable trace store adapter and replay watermark tracking.
6. **[Maintenance]** Add durable RecallForge memory store with provenance-required inserts.
7. **[Maintenance]** Require executionId/correlationId on all terminal events.
8. **[Maintenance]** Add retention policy config for events/traces/memory/proofpacks.
9. **[Maintenance]** Add schema version migration tests for all persisted pillar artifacts.
10. **[Maintenance]** Add explicit error taxonomy shared across runtime/retrieval/policy adapters.
11. **[Maintenance]** Enforce timeout budgets for runtime probe calls.
12. **[Maintenance]** Enforce bounded concurrency and backpressure in probe fanout.
13. **[Maintenance]** Add idempotency keys for replayed memory writes.
14. **[Maintenance]** Add idempotency keys for proofpack regeneration jobs.
15. **[Maintenance]** Ensure high-risk remote operations fail closed when governance unavailable.
16. **[Maintenance]** Add denial reason normalization and operator-facing classification.
17. **[Maintenance]** Add replay continuity tests from event→trace→memory→proofpack.
18. **[Maintenance]** Add degraded-state completeness test suite for all pillar adapters.
19. **[Maintenance]** Remove stale docs claims that imply production distributed orchestration.
20. **[Maintenance]** Create canonical runtime capability matrix doc with explicit unsupported states.
21. **[Leverage]** Build incremental proofpack generation using lineage fragment cache.
22. **[Leverage]** Add event batching for non-critical telemetry with bounded flush intervals.
23. **[Leverage]** Add retrieval deduplication cache keyed by normalized query + policy context.
24. **[Leverage]** Add operator timeline compression for long-running traces.
25. **[Leverage]** Add topology snapshot TTL cache with invalidation hooks.
26. **[Leverage]** Add lazy hydration for heavy operator report sections.
27. **[Leverage]** Add policy evaluation memoization for deterministic repeated checks.
28. **[Leverage]** Add runtime adapter capability fingerprint cache.
29. **[Leverage]** Add smoke command to force degraded retrieval and verify explicit operator output.
30. **[Leverage]** Add smoke command to force policy-engine-unavailable and assert fail-closed deny.
31. **[Leverage]** Add synthetic load benchmark for planner/event/report hot path.
32. **[Leverage]** Add proofpack size/latency metrics to release checklist.
33. **[Leverage]** Add dead-code detection pass to release gating.
34. **[Leverage]** Add route audit script for operator console integrity.
35. **[Leverage]** Add dependency churn report and risk scoring in CI.
36. **[Leverage]** Add deterministic replay snapshot checksum validation.
37. **[Leverage]** Add distributed node heartbeat expiry + explicit offline state transitions.
38. **[Leverage]** Add explicit federation degraded mode in operator console with lineage gaps listed.
39. **[Leverage]** Add runtime placement rationale export to proofpack.
40. **[Leverage]** Add retrieval source trust-score rationale export to proofpack.
41. **[Moat]** Implement cross-pillar lineage graph index (event/trace/memory/policy/retrieval).
42. **[Moat]** Implement verifiable governance chain-of-custody for approvals and overrides.
43. **[Moat]** Build multi-tenant evidence isolation verifier for proofpack exports.
44. **[Moat]** Build deterministic replay attestation signatures for audit exports.
45. **[Moat]** Add adaptive risk escalation that remains policy-supervised and provenance-backed.
46. **[Moat]** Add operator-facing contradiction detector between policy outcome and runtime execution.
47. **[Moat]** Add lineage-aware retrieval confidence model with explicit low-confidence labeling.
48. **[Moat]** Add anomaly detection on event lineage gaps and orphan spans.
49. **[Moat]** Add trust-boundary verifier for distributed mesh registration and token provenance.
50. **[Moat]** Publish nautilus doctrine conformance scorecard as part of release readiness.
