<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Omega Release Readiness

Date: 2026-05-18

## Verdict

**Conditional GO** for continued alpha progression, **NO-GO** for claiming full distributed production readiness.

## What is release-ready

- Local deterministic truth-loop foundations.
- Explicit degraded-state reporting patterns.
- Core policy-denial semantics and governance-first posture.
- Baseline verification and test infrastructure.

## What is not release-ready for production claims

- Unified canonical event contract across all paths.
- End-to-end durable lineage continuity (event/trace/memory/proofpack).
- Full distributed edge mesh trust boundaries and replay guarantees.
- Comprehensive device/runtime topology reliability under heterogeneous fleets.

## Required release notes truth (must include)

1. Distributed execution/federation remains limited/scaffold-level.
2. Several persistence paths are in-memory by default.
3. Degraded/unavailable states are expected in unsupported environments.
4. Governance fail-closed applies to high-risk policy checks; coverage expansion ongoing.

## Pre-release gate checklist

- [ ] Single canonical event schema adopted or compatibility matrix documented.
- [ ] Proofpack includes explicit missing-evidence declarations.
- [ ] CI includes lineage continuity gate tests.
- [ ] Smoke scripts cover happy path + forced degraded path.
- [ ] Runtime capability matrix updated with explicit unsupported states.

## Known limitations

- Remote runtime capabilities are not uniformly equivalent to local runtime behavior.
- Replay/provenance durability is incomplete for all operating modes.
- Some topology telemetry is best-effort, not guaranteed.
