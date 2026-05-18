// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { trackedFiles, read, fail, pass } from './common.mjs';

const mdFiles = trackedFiles().filter((f) => f.endsWith('.md'));
let links = 0;
for (const file of mdFiles) {
  const content = read(file);
  const matches = content.match(/\[[^\]]+\]\((?!https?:\/\/|mailto:)[^)]+\)/g);
  if (matches) links += matches.length;
}
if (links === 0) fail('No local markdown links were found to validate.');
pass(`Detected ${links} local markdown links across documentation.`);
