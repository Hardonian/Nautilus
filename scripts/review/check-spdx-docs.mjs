// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { trackedFiles, fail, pass, read } from './common.mjs';
const mdFiles = trackedFiles().filter((f) => (f === 'README.md' || f.startsWith('docs/')) && f.endsWith('.md'));
const offenders = mdFiles.filter((f) => !read(f).includes('SPDX-License-Identifier'));
if (offenders.length) fail(`Docs markdown files missing SPDX header: ${offenders.slice(0, 10).join(', ')}`);
pass(`SPDX headers present in ${mdFiles.length} docs markdown files.`);
