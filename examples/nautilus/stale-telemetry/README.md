<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Stale telemetry

This Nautilus MVP example is a deterministic fixture/sample. It is intended for clone-run-verify package validation and does not claim live runtime, GPU telemetry, or external provider behavior.

## Command

```bash
npm run nautilus:examples -- stale-telemetry
```

## Expected output

The canonical expected output is in [expected-output.json](expected-output.json). Important fields:

- `scenario`: `stale-telemetry`
- `finalState`: `completed`
- `degraded`: `true`
- `deterministicSample`: `true`

## Degraded-state explanation

Telemetry is marked stale and excluded from healthy-runtime claims.

This example intentionally shows a degraded or terminal state. The output includes `failure`, `evidence`, and `validation` fields so operators can see what degraded and why.

## Smoke coverage

Run this example directly through the examples smoke command:

```bash
npm run nautilus:examples -- stale-telemetry
```

Run the full Nautilus package verification suite:

```bash
npm run nautilus:verify
```

## Unsupported claims

- Does not infer current GPU health from stale samples.

## What this demonstrates

This scenario demonstrates deterministic Nautilus operator evidence for a known state transition and contract-valid output shape.

## Unsupported vs failed

- **Unsupported** means this MVP package does not implement a capability and does not claim it exists.
- **Failed** means the scenario reached a terminal `failed` state for a supported evidence contract.

## How operator should react

1. Run the scenario command shown above.
2. Compare `finalState`, `degraded`, and `failure` to expected values.
3. If degraded or failed, inspect `evidence.events` and `unsupportedClaims` before escalating.
