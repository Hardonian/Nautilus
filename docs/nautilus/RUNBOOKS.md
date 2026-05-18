<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Truth Boundaries
Implemented now: contract validation for eight Nautilus kinds, deterministic execution state transitions, failure semantics matrix, and a CI-safe golden path smoke.
Scaffolded: replay and evidence objects are local in-memory structures (not persisted service APIs).
Not supported: cross-cluster consensus truth and multi-tenant runtime arbitration.
Implications: operators must treat `degraded=true` and non-`completed` states as partial truth and inspect emitted evidence.
Verify: `npm run nautilus:golden-path` and `npm test -- test/nautilus/*.test.ts`.
