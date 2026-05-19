<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Queue saturation

This Nautilus MVP example is a deterministic fixture/sample. It is intended for clone-run-verify package validation and does not claim live runtime, GPU telemetry, or external provider behavior.

## Command

```bash
npm run nautilus:examples -- queue-saturation
```

## Expected output

The canonical expected output is in [expected-output.json](expected-output.json). Important fields:

- `scenario`: `queue-saturation`
- `finalState`: `failed`
- `degraded`: `true`
- `deterministicSample`: `true`

## Degraded-state explanation

Queue saturation is represented as a timeout/degraded package fixture with replayable terminal evidence.

This example intentionally shows a degraded or terminal state. The output includes `failure`, `evidence`, and `validation` fields so operators can see what degraded and why.

## Smoke coverage

Run this example directly through the examples smoke command:

```bash
npm run nautilus:examples -- queue-saturation
```

Run the full Nautilus package verification suite:

```bash
npm run nautilus:verify
```

## Unsupported claims

- Does not invent scheduler capacity metrics.
