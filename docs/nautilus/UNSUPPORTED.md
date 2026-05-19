<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus MVP Unsupported Features

This page centralizes capabilities that are **not implemented** in the Nautilus operator MVP package.

## Unsupported (not implemented)

- Live OpenShell sandbox launch/repair from Nautilus smoke scripts.
- Live GPU telemetry collection.
- External model-provider invocation.
- External side-effect replay.
- Cross-cluster consensus truth and multi-node orchestration.

## Supported but may fail/degrade

- Contract validation for MVP artifacts.
- Deterministic scenario execution state transitions.
- Deterministic proofpack sample generation (`complete` and `partial`).
- Deterministic replay report generation (`read_only`).

## Operator rule

- Treat **unsupported** as scope boundary (do not expect runtime behavior).
- Treat **failed/degraded** as runtime/evidence truth within supported fixture contracts.
