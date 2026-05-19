// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { read, fail, pass, assertFile } from './common.mjs';
assertFile('docs/nautilus/platform-evolution.md');
const doc = read('docs/nautilus/platform-evolution.md');
for (const header of ['Implemented', 'Scaffolded', 'Not implemented']) {
  if (!doc.includes(header)) fail(`platform-evolution.md missing matrix section: ${header}`);
}
pass('Platform capability matrix sections are present.');
