<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Local operator environment

Use `.env.example` as the baseline local environment file for operator workflows.

## Supported local variables

- `NEMOCLAW_PROFILE=local`
- `NEMOCLAW_LOG_LEVEL=info`
- `NEMOCLAW_SANDBOX_PROVIDER=openshell`

## Unsupported environment modes

The following are unsupported for local operator startup and should be treated as degraded:

- Production secrets embedded in `.env`
- Empty or malformed provider identifiers
- Cloud e2e assumptions without explicit `BREV_API_TOKEN`

When unsupported modes are detected, use `npm run doctor` and treat any degraded checks as blocking for release packaging.
