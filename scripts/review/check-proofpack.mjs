// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { assertFile, pass } from './common.mjs';
assertFile('scripts/verify-core.js');
assertFile('docs/verification/verification-matrix.md');
pass('Proof/verification artifacts required for RC exist.');
