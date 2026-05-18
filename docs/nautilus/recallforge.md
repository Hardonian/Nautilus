<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# recallforge

## Implemented (M7 operational intelligence)
- Provenance-backed RecallForge aggregation is implemented in `src/lib/control-plane/recallforge-intelligence.ts`.
- Implemented summaries:
  - routing outcome counts
  - failure fingerprint clustering with evidence event IDs
  - fallback effectiveness
  - retrieval quality summaries
  - policy denial summaries
  - operator override summaries
- Recommendation candidates are advisory-only and carry explicit confidence labels with evidence references.

## Explicit truth boundaries
- Recommendations do not execute actions.
- Low-confidence insights are explicitly labeled `confidence=low`.
- No autonomous learning or fake optimization claims are made.

## Tests and verification
- Summary aggregation, evidence linkage, and advisory recommendation labeling are covered in `src/lib/control-plane/recallforge-intelligence.test.ts`.

## Planned
- Persisted RecallForge intelligence timeline and operator review UX.
- Cross-run clustering and long-horizon trend windows.
