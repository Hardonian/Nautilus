<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Verification Matrix (Gap-Driven)

| Feature/Area | Current Coverage | Missing Tests | Verification Command | Risk if Untested |
|---|---|---|---|---|
| Install/bootstrap | Partial (normal path + local fallback docs) | Proxy-restricted install CI lane and hook-tool failure-mode tests | `npm ci` and `npm ci --ignore-scripts` | Contributors blocked, false build failures |
| Lint/type boundaries | Strong | Additional boundary ownership lint for canonical pillar contracts | `npm run lint` / `npm run typecheck` | Contract drift |
| Build outputs | Strong (CLI + blueprint tsconfig compile) | Artifact integrity check across dist/bin seams | `npm run build` | Runtime/package mismatch |
| Unit suites (plugin + nautilus) | Strong (481 tests passing) | Additional GPU-routing + queue backpressure contract tests | `npm run test:unit` | Regressions in critical control seams |
| End-to-end full test command | Partial (long-running/hanging risk observed) | Bounded, segmented, timeout-instrumented full-suite contract | `npm test` | Release uncertainty and local non-determinism |
| Governed provider routing | Good seam coverage | Real timing assertions and queue wait evidence assertions | `npm run verify:governed-routing` | Operator trust gaps in receipts |
| Local/remote probes | Good seam coverage | More adversarial network/auth failure matrix | `npm run verify:local-probes` / `npm run verify:remote-probes` | Hidden degraded pathways |
| Scheduler semantics | Good deterministic baseline | VRAM/context/latency-aware score and tie-break tests | `npm run verify:control-plane` | Suboptimal routing under load |
| Proofpack/replay/export | Present in script surface | Integrated pipeline test for proofpack+replay+export together | `npm run verify:proofpack` / `npm run verify:replay` / `npm run verify:export` | Audit chain breaks |
| Release readiness | Present | Explicit matrix that blocks on unresolved high severity gaps | `npm run verify:release-readiness` | Shipping with known high-risk gaps |

| Default npm test path boundedness | Implemented: `npm test` now maps to bounded unit suite (`test:unit`) | Optional full-suite watchdog coverage for `test:full` in CI lanes | `npm test` and `npm run test:full` | Long suite moved behind explicit opt-in; residual risk is opt-in runtime variability |
| Restricted install path clarity | Implemented documentation for restricted-proxy fallback (`npm ci --ignore-scripts`) | Upstream hook dependency fetch still externally constrained in proxy environments | `npm ci` and `npm ci --ignore-scripts` | Normal path still depends on external fetch allowance |
