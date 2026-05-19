---
title: Nautilus MVP Release Checklist
---

<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus MVP Release Checklist

Use this checklist before publishing a Nautilus MVP package branch.

## Required commands

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build:cli
npm run nautilus:golden-path
npm run nautilus:replay-smoke
npm run nautilus:proofpack-smoke
npm run nautilus:runtime-health-smoke
npm run nautilus:examples
npm run nautilus:verify
```

## Artifact checks

```bash
find examples/nautilus -maxdepth 2 -type f | sort
find test/fixtures/nautilus -maxdepth 1 -type f | sort
```

## Release truth checks

- Confirm every sample output has `deterministicSample: true`.
- Confirm degraded examples remain visibly degraded.
- Confirm unsupported live-runtime features are documented in `docs/nautilus/OPERATOR_QUICKSTART.md` and `docs/nautilus/NOT_YET_SUPPORTED.md`.
- Do not claim live telemetry, distributed execution, or production proofpack persistence from fixture-only smoke outputs.
