// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildProofpack } from "./fixtures";
import { signExport } from "../../src/lib/security/export-signer";

const mode = process.argv[2] === "complete" ? "complete" : "partial";
process.stdout.write(`${JSON.stringify(signExport(buildProofpack(mode)), null, 2)}\n`);
