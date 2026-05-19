---
title: Nautilus MVP Package
---

<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus MVP Package

The Nautilus MVP package is a clone-run-verify bundle for deterministic local validation. It does not start a live sandbox or claim production telemetry; every output is marked as a deterministic fixture/sample.

## Package entrypoints

```bash
npm install
npm run nautilus:golden-path
npm run nautilus:proofpack-smoke
npm run nautilus:replay-smoke
npm run nautilus:examples
npm run nautilus:verify
```

Additional degraded-state smoke command:

```bash
npm run nautilus:runtime-health-smoke
```

## What is included

- Runnable package entrypoints in `package.json`.
- Ten examples under `examples/nautilus/`.
- Deterministic sample outputs under `examples/nautilus/outputs/`.
- Deterministic fixtures under `test/fixtures/nautilus/`.
- A dedicated GitHub Actions workflow for install, lint, typecheck, tests, build, and Nautilus smoke coverage.

## What is not claimed

- No live OpenShell sandbox is launched by these smoke commands.
- No GPU telemetry is collected.
- No external model provider is called.
- No distributed scheduler, cluster consensus, or multi-node execution is represented as complete.
