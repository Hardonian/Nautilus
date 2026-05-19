---
title: Verify Nautilus Locally
---

<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Verify Nautilus Locally

Use these commands from the repository root after cloning.

## Install dependencies

```bash
npm install
```

## Run the Nautilus package checks

```bash
npm run nautilus:golden-path
npm run nautilus:replay-smoke
npm run nautilus:proofpack-smoke
npm run nautilus:runtime-health-smoke
npm run nautilus:examples
npm run nautilus:verify
```

## Run broader repo checks

```bash
npm run lint
npm run typecheck
npm test
npm run build:cli
```

If an environment lacks optional toolchains, record that as an environment limitation. Do not convert failed critical package checks into silent skips.
