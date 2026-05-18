<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Top 50 TODOs

Priority legend: P0 (urgent), P1 (near-term), P2 (strategic)

## Maintenance
1. [P0][Maintenance] Enforce bounded event queue limits in all runtime emitters.
2. [P0][Maintenance] Add retention eviction telemetry for event/memory adapters.
3. [P0][Maintenance] Standardize adapter timeout defaults and classification.
4. [P0][Maintenance] Standardize retry policies by adapter capability class.
5. [P0][Maintenance] Add idempotency keys to proofpack persistence writes.
6. [P0][Maintenance] Add idempotency keys to replay snapshot persistence writes.
7. [P0][Maintenance] Add explicit `missing_evidence` payload to proofpack terminal schema.
8. [P0][Maintenance] Fail CI on docs claims that exceed implemented capability tags.
9. [P0][Maintenance] Expand policy-denial reason codes to complete operator taxonomy.
10. [P0][Maintenance] Add chaos tests for policy-engine-unavailable fail-closed branch.
11. [P1][Maintenance] Add chaos tests for retrieval unavailable + timeout paths.
12. [P1][Maintenance] Add restart continuity tests for in-memory adapter degradation.
13. [P1][Maintenance] Add schema migration harness for event contract versions.
14. [P1][Maintenance] Add schema migration harness for memory/recall records.
15. [P1][Maintenance] Add schema migration harness for trace/replay records.
16. [P1][Maintenance] Tighten error classes across runtime adapters and planners.
17. [P1][Maintenance] Normalize degraded-state enum usage across all pillars.
18. [P1][Maintenance] Add deterministic replay checksum assertions in CI.
19. [P1][Maintenance] Add bounded operator timeline pagination guardrails.
20. [P1][Maintenance] Add dead-letter queue contract for rejected events.

## Leverage
21. [P0][Leverage] Implement durable local event-fabric storage adapter.
22. [P0][Leverage] Implement durable RecallForge storage with provenance indexes.
23. [P0][Leverage] Implement durable OperatorGraph trace/replay storage adapter.
24. [P0][Leverage] Unify replay reference key across event/trace/proofpack/reporting.
25. [P0][Leverage] Add runtime capability snapshot API with explicit stale markers.
26. [P1][Leverage] Add incremental proofpack generation cache keyed by lineage hash.
27. [P1][Leverage] Batch event writes with bounded flush intervals.
28. [P1][Leverage] Add retrieval dedup cache with confidence/freshness labels.
29. [P1][Leverage] Coalesce duplicate runtime probes within one planning epoch.
30. [P1][Leverage] Add correlation-aware operator report drill-down endpoints.
31. [P1][Leverage] Add lineage completeness score in operator reporting.
32. [P1][Leverage] Add topology snapshot cache with deterministic invalidation rules.
33. [P1][Leverage] Add policy-pack explainability bundles for operator denials.
34. [P1][Leverage] Add distributed replay stitching contract for edge nodes.
35. [P1][Leverage] Add remote execution approval receipt chaining.
36. [P2][Leverage] Add trace archival compression for cold storage paths.
37. [P2][Leverage] Add build-time contract drift checker across docs/code.
38. [P2][Leverage] Add “truth-loop continuity” synthetic benchmark suite.
39. [P2][Leverage] Add adapter capability matrix generator from runtime probes.
40. [P2][Leverage] Add dependency graph budget checks for runtime-critical packages.

## Moat
41. [P0][Moat] Enforce end-to-end evidence-linked recommendations in RecallForge outputs.
42. [P0][Moat] Enforce no-simulation policy for retrieval claims at API boundary.
43. [P0][Moat] Introduce signed policy lineage receipts for high-risk approvals.
44. [P1][Moat] Add cross-node trust score attestation with expiry semantics.
45. [P1][Moat] Add operator-facing proofpack integrity verification workflow.
46. [P1][Moat] Add tamper-evident event lineage chain checkpoints.
47. [P1][Moat] Add federated degraded-state doctrine for offline/partitioned mesh.
48. [P2][Moat] Add replay determinism certification profile for regulated deployments.
49. [P2][Moat] Add tenant-isolated evidence export packages with policy snapshots.
50. [P2][Moat] Add governance drift detector for policy-pack vs runtime behavior.
