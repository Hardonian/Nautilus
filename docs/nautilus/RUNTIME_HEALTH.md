<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus runtime health

## Implemented

- `core/runtime/health.ts` classifies runtime adapter probes as `available`, `degraded`, or `unavailable`.
- Empty probe sets are `unavailable` with `no_runtime_probes` as the reason.
- Mixed reachable and unreachable adapters are `degraded`, not healthy.
- Probe reasons are preserved so operators can distinguish adapter failure from missing telemetry.

## Scaffolded

- Health classification is pure and in-process. It does not start containers, query GPUs, or poll external runtime services.
- Runtime adapter realism is represented by explicit probe outcomes rather than inferred dashboard state.

## Planned

- Runtime-specific probe collectors for local OpenShell, container, GPU, and remote inference adapters.
- Health history linked into replay and proofpack evidence.

## Degraded behavior

- Unreachable adapters make the runtime degraded if at least one adapter remains reachable.
- All adapters unreachable, or no probes, is unavailable.
- The health model does not invent successful telemetry when probes are missing.

## Replay implications

- Runtime health changes should be recorded as replay-visible events before being included in proofpacks.
- Degraded and unavailable states are evidence states, not transient UI labels.

## Known limitations

- There is no long-running health daemon in this change.
- Adapter probes are caller-provided and must be wired to real runtime checks before production use.
