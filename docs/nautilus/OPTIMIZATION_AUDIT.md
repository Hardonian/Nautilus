<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Optimization Audit

## Optimization doctrine
- Prioritize measurable correctness-preserving gains.
- No optimization that obscures degraded truth or evidence continuity.

## Prioritized opportunities

1. **Proofpack incremental assembly** (High)
   - Avoid recomputing unchanged lineage slices per operator refresh.
2. **Event batching with bounded flush windows** (High)
   - Reduce serialization overhead while preserving ordering/causality markers.
3. **Retrieval dedup + trust-score cache** (High)
   - Reuse recent evidence signatures with explicit freshness labels.
4. **Topology snapshot caching** (Medium)
   - Cache capability snapshots with short TTL and explicit stale markers.
5. **Adapter call coalescing** (Medium)
   - Collapse duplicate runtime probe calls during one planning epoch.
6. **Trace compression for archival payloads** (Medium)
   - Keep operator-visible summaries uncompressed; compress archival blobs only.
7. **Dependency surface cleanup** (Low)
   - Remove non-essential packages from hot runtime paths.

## Non-goals
- No “smooth UI” optimization that hides unavailable lineage.
- No speculative caching without confidence/degradation labeling.
