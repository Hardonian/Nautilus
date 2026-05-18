// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { read, fail, pass } from './common.mjs';

const readme = read('README.md');
const required = ['Implemented', 'Scaffolded', 'Not implemented'];
for (const token of required) {
  if (!readme.includes(token)) fail(`README missing capability truth token: ${token}`);
}
pass('Capability truth claims exist in README.');
