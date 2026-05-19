// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { read, fail, pass } from './common.mjs';
const index = read('docs/index.md');
for (const section of ['Get Started', 'Explore']) {
  if (!index.includes(section)) fail(`docs/index.md missing section: ${section}`);
}
pass('docs index contains required onboarding/navigation sections.');
