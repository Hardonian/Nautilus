// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";

import { runDeployAction } from "../actions/global";
import DeployCliCommand from "./deploy";

vi.mock("../actions/global", () => ({
  runDeployAction: vi.fn().mockResolvedValue(undefined),
}));

const rootDir = process.cwd();

describe("deploy oclif command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls runDeployAction with the provided instance name", async () => {
    await DeployCliCommand.run(["my-gpu-instance"], rootDir);

    expect(runDeployAction).toHaveBeenCalledWith("my-gpu-instance");
  });

  it("calls runDeployAction with undefined when no instance name is provided", async () => {
    await DeployCliCommand.run([], rootDir);

    expect(runDeployAction).toHaveBeenCalledWith(undefined);
  });
});
