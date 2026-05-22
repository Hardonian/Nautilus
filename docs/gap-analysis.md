<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nautilus Gap Analysis (Reality Mode)

## Executive summary
This pass found a strong contract-first foundation (policy gates, deterministic scheduler seam, degraded-state semantics, replay/proofpack posture), but also meaningful gaps between claimed platform identity and currently implemented runtime behavior.

Highest-risk themes:
1. install path fragility (`npm ci` fails in proxied environments due to `@j178/prek` release fetch),
2. deterministic scheduler exists but is not a full GPU/VRAM-aware runtime router,
3. remote execution and heterogeneous routing remain mostly guarded scaffolds,
4. observability is seam-heavy but missing production telemetry depth,
5. verification breadth is high but end-to-end runtime smoke hangs risk under monolithic `npm test`.

## Current verification status (2026-05-22 UTC)
- `npm ci` **failed** (403 tunnel/proxy on `@j178/prek` install script).
- `npm ci --ignore-scripts` **passed** (local restricted fallback).
- `npm run lint` **passed**.
- `npm run typecheck` **passed**.
- `npm run build` **passed**.
- `npm run test:unit` **passed** (481 tests).
- `npm test` did not complete within audit window (likely long-running/hanging suite behavior).

## Structured gap inventory

| ID | Category | Severity | Type | Confidence | Evidence | Gap | Recommended fix | Verification command | Impact | Moat |
|---|---|---|---|---|---|---|---|---|---|---|
| G01 | Testing/CI | High | Hardening | High | `npm ci` 403 on `@j178/prek` install script | Dependency bootstrap brittle in proxy-restricted environments | Pin fallback behavior in CI/docs; gate hook tooling from runtime install path; add explicit `npm ci --ignore-scripts` local troubleshooting profile | `npm ci` and `npm ci --ignore-scripts` | Faster contributor onboarding, fewer false negatives | Maintenance |
| G02 | Performance / GPU routing | High | Architecture | High | `src/lib/control-plane/scheduler.ts` score uses local/remote+streaming only | No VRAM/capacity/cost/latency-aware model routing in canonical scheduler | Extend `SchedulingCandidate` input contract with VRAM, context budget, recent latency, queue pressure; keep deterministic tie-breaks | `npm run verify:control-plane` + new scheduler tests | Better QoS and deterministic scaling | Leverage |
| G03 | GPU handoff | High | Feature | Medium | README explicit “Not implemented: GPU balancing” | Platform identity emphasizes GPU handoff, implementation still scaffold-level | Add device telemetry adapter contract -> scheduler bridge, explicit degraded when unavailable | `npm run verify:local-probes` + new integration tests | Realizes key Nautilus promise | Moat |
| G04 | Reliability | Medium | Test | High | `npm test` non-terminating during audit window | Monolithic test command may include long tails/hanging process risk | Split default `npm test` to bounded suites + explicit long-run suites; add watchdog summary | `npm test` under timeout in CI/local | Predictable release cadence | Maintenance |
| G05 | Observability | Medium | Hardening | Medium | `src/lib/control-plane/governed-provider-routing.ts` timing is static `totalMs: 0` | Receipts/events lack real runtime timing in governed path | Wire measured durations and optional queue wait / probe latency fields | `npm run verify:governed-routing` + receipt assertions | Better trust and root-cause clarity | Leverage |
| G06 | Security/Safety | Medium | Security | Medium | Remote seams exist; many flows opt-in + guarded | Need stronger authn/authz boundary docs for remote routes and operator approvals | Add authoritative trust-boundary matrix in docs + tests for deny-by-default non-local endpoints | `npm run verify:remote-probes` and remote execution tests | Lowers misconfiguration risk | Maintenance |
| G07 | Architecture boundaries | Medium | Architecture | High | Many docs and seams across root CLI + plugin + blueprint | Canonical ownership map exists, but enforcement lint is partial | Add boundary contract lints for `core/*` owner zones and event schema single-source checks | `npm run checks` + new contract lint command | Prevents drift / duplicate truths | Moat |
| G08 | UX / Operator clarity | Medium | UX | Medium | operator-console present, but runtime decision trace depth uncertain | Limited operator-visible “why this route/model” timeline from live runtime receipts | Add receipt-backed timeline panels (decision reasons, degraded transitions, fallback attempts) | console tests + snapshot/contract tests | Improves operator trust and adoption | Leverage |
| G09 | Docs/onboarding | Low | Docs | High | README states many explicit not-implemented areas; install fallback note exists | No single gap/risk matrix tying claims to verification status | Keep `docs/gap-analysis.md` as release artifact updated per cycle | `npm run verify:release-readiness` + docs checks | Reduces roadmap ambiguity | Maintenance |
| G10 | Future-proofing | Medium | Feature | Medium | `execution-queue-store.ts` exists but broader queue governance unclear | Missing explicit queue backpressure/idempotency strategy at platform level | Define queue contract for retries/idempotency/load shedding; test degraded behavior | queue store tests + new integration tests | Essential for scale safety | Moat |

## Top 10 highest-leverage fixes
1. Make install/verification deterministic in restricted networks (G01).
2. Add VRAM/context/latency-aware deterministic scheduler scoring (G02).
3. Implement real GPU/model capability registry feed into routing (G03).
4. Bound and segment `npm test` runtime for deterministic CI/local trust (G04).
5. Upgrade receipt timing/queue metrics from static placeholders to observed values (G05).
6. Harden remote trust and approval matrix with deny-by-default regression tests (G06).
7. Enforce architecture ownership boundaries with automated contract checks (G07).
8. Surface full route decision + degraded narrative in operator console (G08).
9. Institutionalize this gap matrix as release proof artifact (G09).
10. Add queue backpressure/idempotency/load-shedding contracts with tests (G10).

## Architecture risk highlights
- Contract truth is disciplined, but implementation breadth remains uneven between local deterministic seams and “future runtime orchestration” goals.
- Scheduler and governed routing are deterministic but intentionally conservative; risks are underpowered resource-awareness rather than unsafe autonomy.
- Cross-project seams (root CLI, plugin, blueprint) increase drift risk without stronger contract linting.

## UX/product opportunities
- Receipt-driven operator timeline and “why denied/degraded” overlays.
- First-run readiness wizard for local model runtime / proxy / policy profile validation.
- Saved run replay comparison for operator postmortems.

## Performance/model-routing opportunities
- Latency-aware routing (rolling p50/p95).
- Context-window-aware model selection.
- Queue-pressure-based admission and graceful degraded shedding.
- Warm model residency hints in registry.

## Future roadmap linkage
See `docs/roadmap.md` for R0-R5 prioritized execution plan and ownership-ready task slices.

## R0 implementation update (2026-05-22)
- Default `npm test` is now bounded to deterministic unit projects (`plugin` + `nautilus`) via `test:unit`.
- Full-repo Vitest sweep moved to explicit opt-in command: `npm run test:full`.
- Restricted/proxy install behavior is now treated as explicit degraded path:
  - `npm ci` may fail when postinstall fetch for `@j178/prek` is blocked (403/proxy).
  - `npm ci --ignore-scripts` is the supported restricted bootstrap path for local auditing.
  - CI remains fail-closed on normal path; restricted mode is a documented local fallback and does not mutate lockfile.
