// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The project intentionally imports from dist/ to ensure coverage mapping works correctly.
import SandboxConfigGetCommand, {
  printConfigUsageAndExit,
} from "../../../../dist/lib/commands/sandbox/config/get.js";
import * as sandboxConfig from "../../../../dist/lib/sandbox-config.js";

vi.mock("../../../../dist/lib/sandbox-config.js", () => {
  return {
    configGet: vi.fn(),
  };
});

describe("SandboxConfigGetCommand", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;
  let mockStderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    mockStderr = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls configGet with the correct arguments", async () => {
    await SandboxConfigGetCommand.run(["alpha", "--key", "model", "--format", "yaml"]);

    expect(sandboxConfig.configGet).toHaveBeenCalledTimes(1);
    expect(sandboxConfig.configGet).toHaveBeenCalledWith("alpha", {
      key: "model",
      format: "yaml",
    });
  });

  it("calls configGet with default format when format is not provided", async () => {
    await SandboxConfigGetCommand.run(["alpha", "--key", "model"]);

    expect(sandboxConfig.configGet).toHaveBeenCalledTimes(1);
    expect(sandboxConfig.configGet).toHaveBeenCalledWith("alpha", {
      key: "model",
      format: "json",
    });
  });

  it("calls configGet with null key when key is not provided", async () => {
    await SandboxConfigGetCommand.run(["alpha"]);

    expect(sandboxConfig.configGet).toHaveBeenCalledTimes(1);
    expect(sandboxConfig.configGet).toHaveBeenCalledWith("alpha", {
      key: null,
      format: "json",
    });
  });

  it("fails if sandbox name is missing", async () => {
    await expect(SandboxConfigGetCommand.run([])).rejects.toThrow(/Missing 1 required arg/);
  });

  it("fails if invalid format is provided", async () => {
    await expect(SandboxConfigGetCommand.run(["alpha", "--format", "invalid"])).rejects.toThrow(/Expected --format=invalid to be one of: json, yaml/);
  });

  describe("printConfigUsageAndExit", () => {
    it("prints usage and exits", () => {
      printConfigUsageAndExit();

      expect(mockStderr).toHaveBeenCalledTimes(1);
      expect(mockStderr.mock.calls[0][0]).toContain("Usage:");
      expect(mockStderr.mock.calls[0][0]).toContain("config get");

      expect(mockExit).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
