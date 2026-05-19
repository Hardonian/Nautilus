// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { read, fail, pass } from './common.mjs';
const doc = read('README.md');
if (doc.includes('self-healing') && !doc.includes('Not implemented')) {
  fail('Potential overclaim: self-healing present without explicit not-implemented qualifier.');
}
pass('No obvious architecture-theatre claim regression detected.');
