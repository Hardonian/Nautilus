#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

# SPDX-License-Identifier: MIT
#
# Reject force-added files that .gitignore would normally block.
# Only inspects files newly added to the index in this commit
# (git diff --cached --diff-filter=A), so pre-existing tracked
# files that happen to match ignore rules are not flagged.
set -euo pipefail

NEW=$(git diff --cached --name-only --diff-filter=A -- "$@")
if [ -n "$NEW" ]; then
  IGNORED=$(echo "$NEW" | xargs git check-ignore --stdin 2>/dev/null || true)
  if [ -n "$IGNORED" ]; then
    echo "Force-added files that .gitignore would block:"
    echo "$IGNORED"
    exit 1
  fi
fi

