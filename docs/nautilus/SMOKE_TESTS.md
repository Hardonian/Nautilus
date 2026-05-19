---
title: Nautilus Smoke Tests
---

<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus Smoke Tests

The package smoke tests verify contract validation, deterministic execution evidence, explicit degraded states, proofpack samples, replay samples, and example fixture sync.

## Smoke commands

```bash
npm run nautilus:golden-path
npm run nautilus:replay-smoke
npm run nautilus:proofpack-smoke
npm run nautilus:runtime-health-smoke
npm run nautilus:examples
npm run nautilus:verify
```

## Expected behavior

- `nautilus:golden-path` emits a completed deterministic scenario.
- `nautilus:replay-smoke` emits a read-only replay report.
- `nautilus:proofpack-smoke` emits a partial proofpack by default; use `npx tsx scripts/nautilus/proofpack-smoke.ts complete` for the complete fixture.
- `nautilus:runtime-health-smoke` emits an explicit degraded runtime-health sample.
- `nautilus:examples` verifies every example README, command, and expected output.
- `nautilus:verify` runs the package verification chain.
