<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Replay from evidence

This Nautilus MVP example is a deterministic fixture/sample. It is intended for clone-run-verify package validation and does not claim live runtime, GPU telemetry, or external provider behavior.

## Command

```bash
npm run nautilus:replay-smoke
```

## Expected output

The canonical expected output is in [expected-output.json](expected-output.json). Important fields:

- `scenario`: `replay-from-evidence`
- `finalState`: `completed`
- `degraded`: `false`
- `deterministicSample`: `true`

## Degraded-state explanation

Replay reads deterministic evidence and reports reproducible state without live mutation.

This example is not degraded. It still uses deterministic fixture evidence instead of live runtime telemetry.

## Smoke coverage

Run this example directly through the examples smoke command:

```bash
npm run nautilus:examples -- replay-from-evidence
```

Run the full Nautilus package verification suite:

```bash
npm run nautilus:verify
```

## Unsupported claims

- Does not replay external side effects.
