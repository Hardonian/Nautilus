<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus proofpacks

## Implemented

- `core/event-fabric/proofpack.ts` builds deterministic proofpack manifests from replay references, policy replay references, and evidence hashes.
- Manifests report `complete`, `partial`, or `incomplete` status.
- Interrupted proofpack assembly is marked `partial`, never `complete`.
- Missing required evidence, missing replay references, or missing policy replay references produce `incomplete` proofpacks with visible notes.
- Manifests include a SHA-256 integrity hash over the manifest status and referenced evidence metadata.

## Scaffolded

- The proofpack manifest is an in-process primitive. It does not package files, sign archives, or upload artifacts.
- Evidence content is represented by caller-provided hashes. This primitive validates presence and status, not external object storage.

## Planned

- Signed proofpack archives.
- Durable artifact storage and retention policy integration.
- Operator download and verification commands.

## Degraded behavior

- Partial evidence remains listed with its evidence ID.
- Missing required evidence is explicit in `missingRequiredEvidence`.
- Interrupted assembly retains visible notes instead of pretending the proofpack completed.

## Replay implications

- Every complete proofpack must include a replay reference and policy replay reference.
- Partial replay references can be included, but the resulting proofpack must remain partial or incomplete according to evidence availability.

## Known limitations

- The current hash is an integrity aid for deterministic tests, not a production signing mechanism.
- No external timestamping, certificate chain, or artifact registry is implemented.
