---
title: Nautilus Operator Quickstart
---

<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus Operator Quickstart

This quickstart is for operators who want to verify the Nautilus MVP package after cloning the repository.

## 1. Install

```bash
git clone https://github.com/Hardonian/NemoClaw-substrate.git
cd NemoClaw-substrate
npm install
```

## 2. Run the golden path

```bash
npm run nautilus:golden-path
```

Expected truth markers:

- `scenario` is `golden-path`.
- `finalState` is `completed`.
- `deterministicSample` is `true`.
- `notice` states that the output is not live telemetry.

## 3. Inspect proofpack output

```bash
npm run nautilus:proofpack-smoke
cat examples/nautilus/outputs/proofpack.complete.json
cat examples/nautilus/outputs/proofpack.partial.json
```

A partial proofpack is valid when it is explicitly marked partial and includes degraded reasons. Do not treat a partial proofpack as complete.

## 4. Replay evidence

```bash
npm run nautilus:replay-smoke
cat examples/nautilus/outputs/replay.report.json
```

Replay is read-only in this MVP package. It verifies deterministic evidence shape and reproduced terminal state; it does not replay external side effects.

## 5. Interpret degraded states

```bash
npm run nautilus:runtime-health-smoke
npm run nautilus:examples -- runtime-unavailable
npm run nautilus:examples -- retrieval-degraded
npm run nautilus:examples -- stale-telemetry
```

A degraded state means the package is telling the operator a dependency, evidence class, or runtime signal is incomplete. Inspect `failure`, `degraded`, `finalState`, and `evidence` before making operational claims.

## 6. Verify repository health

```bash
npm run lint
npm run typecheck
npm test
npm run build:cli
npm run nautilus:verify
```

## 7. Known unsupported features

- Live OpenShell sandbox launch is not part of these Nautilus smoke scripts.
- GPU telemetry samples are fixtures, not live device measurements.
- External inference providers are not called.
- Distributed multi-node orchestration and cluster consensus are not implemented by this package track.
- Fixture proofpacks are sample artifacts, not production persistence guarantees.
