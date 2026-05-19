// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildRuntimeHealthDegraded } from "./fixtures";

process.stdout.write(`${JSON.stringify(buildRuntimeHealthDegraded(), null, 2)}\n`);
