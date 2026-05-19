<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# meshrag

## Implemented (M8 minimal real path)
- Deterministic ingestion, embedding, vector store, semantic cache, and retrieval contracts are implemented in `src/lib/control-plane/meshrag.ts`.
- Retrieval responses include replayable lineage (`lineageId`, `replayHash`), explicit degraded reasons, evidence references, and trust-weighted ranking.
- Graph-hop retrieval remains scaffolded only; responses mark `graphHop.status=scaffolded_unavailable`.

## Explicit degraded and unavailable states
- Embedding adapter unavailable.
- Embedding runtime unavailable with local fallback embedding.
- Vector store degraded/unavailable.
- Semantic cache unavailable.
- Unsupported graph retrieval path.

## Tests and verification
- Retrieval lineage, trust scoring, degraded states, cache contracts, and replay determinism are covered in `src/lib/control-plane/meshrag.test.ts`.

## Planned
- Production embedding runtimes and persistent vector stores.
- Distributed graph retrieval and replay inspector integration.
