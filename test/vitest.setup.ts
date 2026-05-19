// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import { afterEach, beforeEach, vi } from "vitest";

const BASE_ENV = { ...process.env };
if (process.platform === "win32") {
  const gitBashPath = "C:\\Program Files\\Git\\bin";
  const gitUsrBinPath = "C:\\Program Files\\Git\\usr\\bin";
  const pathsToAdd = [gitBashPath, gitUsrBinPath].filter(p => fs.existsSync(p));
  let currentPath = BASE_ENV.PATH || process.env.Path || "";
  for (const p of pathsToAdd) {
    if (!currentPath.includes(p)) {
      currentPath = `${p};${currentPath}`;
    }
  }
  BASE_ENV.PATH = currentPath;
  process.env.PATH = currentPath;
  if (process.env.Path) process.env.Path = currentPath;
}

beforeEach(() => {
  process.env.TZ = "UTC";
  process.env.NEMOCLAW_ROUTER_HEALTH_RETRIES ??= "5";
  process.env.NEMOCLAW_ROUTER_HEALTH_INTERVAL_MS ??= "200";
  process.env.NEMOCLAW_ROUTER_HEALTH_TIMEOUT_MS ??= "1000";
  process.env.NEMOCLAW_HEALTH_POLL_COUNT ??= "2";
  process.env.NEMOCLAW_HEALTH_POLL_INTERVAL ??= "1";
  process.env.NEMOCLAW_GATEWAY_START_POLL_COUNT ??= "2";
  process.env.NEMOCLAW_GATEWAY_START_POLL_INTERVAL ??= "1";
  process.env.NEMOCLAW_SANDBOX_READY_TIMEOUT ??= "5";
  process.env.NEMOCLAW_SANDBOX_READY_POLL_COUNT ??= "2";
  process.env.NEMOCLAW_SANDBOX_READY_POLL_INTERVAL ??= "1";
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
