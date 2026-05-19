<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# MVP Foundation Readiness
Completed: hardened contracts, lifecycle transition payloads, detailed failure semantics, and structured golden path evidence.
Scaffolded: replay-from-evidence is contract-ready but not persisted across service boundaries.
Not yet supported: distributed replay orchestration, durable proofpack regeneration pipelines.
Verification status: run install, lint, typecheck, test, build, and golden path commands listed below; existing repository-wide pre-existing type errors outside Nautilus may block global green.
Known risks: global build/typecheck debt in unrelated modules can mask Nautilus-only regressions.
Next branch: `fix/nautilus-mvp-foundation-followup` for durable persistence/replay infra.
Commands:
- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build:cli`
- `npm run nautilus:golden-path`
