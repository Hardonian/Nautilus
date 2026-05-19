<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus Truths (Operational)

## Identity truth

Nautilus is the platform identity. NemoClaw is the runtime/orchestration engine inside Nautilus.

## Product truth hierarchy

1. **Contract truth**: canonical control/event contracts.
2. **Runtime truth**: what running systems can prove now.
3. **Operator truth**: what users are told about state, confidence, and risk.

No downstream layer may overstate upstream truth.

## No-theatre truth rules

- Never represent inferred optimism as observed fact.
- Never report healthy if source data is unavailable/untrusted.
- Never smooth degraded states into generic success.

## Degraded truth policy

- Degraded is an honest, supported product state.
- Operator-facing outputs must include cause class and recovery intent where known.
- Unknown must remain unknown until real evidence arrives.

## Canonical contracts

Nautilus control-plane and event-plane semantics must map to canonical pillar boundaries. Do not create side-contracts in convenience modules.

## Deterministic release truth

Release readiness is demonstrated by deterministic proofpack outputs, not by manual assertion.

## Replay truth

Evidence and state transitions should be replayable from committed artifacts and deterministic command paths. If not replayable, label limitations explicitly.

## Unsupported features truth

“Not supported” is a valid product answer. Do not imply support by returning simulated values or silently dropping fields.
