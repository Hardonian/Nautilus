// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildProofpack } from "./fixtures";

const mode = process.argv[2] === "partial" ? "partial" : "complete";
process.stdout.write(`${JSON.stringify(buildProofpack(mode), null, 2)}\n`);
