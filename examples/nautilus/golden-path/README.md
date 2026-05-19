<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Golden path

This Nautilus MVP example is a deterministic fixture/sample. It is intended for clone-run-verify package validation and does not claim live runtime, GPU telemetry, or external provider behavior.

## Command

```bash
npm run nautilus:golden-path
```

## Expected output

The canonical expected output is in [expected-output.json](expected-output.json). Important fields:

- `scenario`: `golden-path`
- `finalState`: `completed`
- `degraded`: `false`
- `deterministicSample`: `true`

## Degraded-state explanation

All fixture contracts validate and the deterministic execution lifecycle reaches completed.

This example is not degraded. It still uses deterministic fixture evidence instead of live runtime telemetry.

## Smoke coverage

Run this example directly through the examples smoke command:

```bash
npm run nautilus:examples -- golden-path
```

Run the full Nautilus package verification suite:

```bash
npm run nautilus:verify
```

## Unsupported claims

- Does not start a live OpenShell sandbox.
- Does not contact GPU telemetry or model providers.

## What this demonstrates

This scenario demonstrates deterministic Nautilus operator evidence for a known state transition and contract-valid output shape.

## Unsupported vs failed

- **Unsupported** means this MVP package does not implement a capability and does not claim it exists.
- **Failed** means the scenario reached a terminal `failed` state for a supported evidence contract.

## How operator should react

1. Run the scenario command shown above.
2. Compare `finalState`, `degraded`, and `failure` to expected values.
3. If degraded or failed, inspect `evidence.events` and `unsupportedClaims` before escalating.
