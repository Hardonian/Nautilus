---
title: Nautilus Examples
---

<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus Examples

Every example lives under `examples/nautilus/<name>/` and includes `README.md`, `command.txt`, and `expected-output.json`.

## Run all examples

```bash
npm run nautilus:examples
```

## Run one example

```bash
npm run nautilus:examples -- golden-path
npm run nautilus:examples -- runtime-unavailable
npm run nautilus:examples -- policy-denied
npm run nautilus:examples -- retrieval-degraded
npm run nautilus:examples -- proofpack-partial
npm run nautilus:examples -- replay-from-evidence
npm run nautilus:examples -- stale-telemetry
npm run nautilus:examples -- storage-pressure
npm run nautilus:examples -- queue-saturation
npm run nautilus:examples -- full-mvp-demo
```

## Inspect deterministic outputs

```bash
cat examples/nautilus/outputs/proofpack.complete.json
cat examples/nautilus/outputs/proofpack.partial.json
cat examples/nautilus/outputs/replay.report.json
cat examples/nautilus/outputs/operator.report.json
cat examples/nautilus/outputs/runtime.health.degraded.json
```

All outputs are deterministic fixtures/samples, not live telemetry.
