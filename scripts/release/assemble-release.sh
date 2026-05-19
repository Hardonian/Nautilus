#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -euo pipefail

mkdir -p artifacts
npm run verification:summary
npm run release:artifacts

BRANCH="$(git rev-parse --abbrev-ref HEAD | tr '/' '-')"
COMMIT="$(git rev-parse --short HEAD)"
ZIP="artifacts/nemoclaw-${BRANCH}-${COMMIT}.zip"

rm -f "$ZIP"
(
  cd artifacts
  find . -type f | LC_ALL=C sort | zip -X -q "../$(basename "$ZIP")" -@
)

echo "Created release archive: $ZIP"
