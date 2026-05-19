// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, vi } from "vitest";

const BASE_ENV = { ...process.env };

beforeEach(() => {
  process.env.TZ = "UTC";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();

  for (const key of Object.keys(process.env)) {
    if (!(key in BASE_ENV)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(BASE_ENV)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
});
