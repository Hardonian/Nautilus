// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prompt: vi.fn().mockResolvedValue("yes"),
  recoverNamedGatewayRuntime: vi.fn().mockResolvedValue({ recovered: true }),
  runOpenshellProviderCommand: vi.fn(),
}));

vi.mock("../../credentials/store", () => ({ prompt: mocks.prompt }));
vi.mock("../../actions/global", () => ({
  recoverNamedGatewayRuntime: mocks.recoverNamedGatewayRuntime,
  runOpenshellProviderCommand: mocks.runOpenshellProviderCommand,
}));
vi.mock("./common", () => ({
  isBridgeProviderName: vi.fn().mockImplementation((name) => name.includes("bridge")),
  recoverGatewayOrExit: vi.fn().mockResolvedValue(undefined),
}));

import CredentialsResetCommand from "./reset";

const rootDir = process.cwd();

describe("credentials:reset oclif command source coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runOpenshellProviderCommand.mockReturnValue({ status: 0 });

    // Silence console
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock exit to throw
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exits if no provider is passed", async () => {
    await expect(CredentialsResetCommand.run([], rootDir)).rejects.toThrow("process.exit(1)");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Usage: "));
  });

  it("exits if provider is a bridge provider", async () => {
    await expect(CredentialsResetCommand.run(["my-bridge"], rootDir)).rejects.toThrow(
      "process.exit(1)",
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("per-sandbox messaging bridge"),
    );
  });

  it("prompts for confirmation and exits if user cancels", async () => {
    mocks.prompt.mockResolvedValueOnce("no");
    await CredentialsResetCommand.run(["nvidia-prod"], rootDir);
    expect(mocks.prompt).toHaveBeenCalledWith(
      expect.stringContaining("Remove provider 'nvidia-prod'"),
    );
    expect(console.log).toHaveBeenCalledWith("  Cancelled.");
    expect(mocks.runOpenshellProviderCommand).not.toHaveBeenCalled();
  });

  it("skips prompt and deletes provider with --yes", async () => {
    await CredentialsResetCommand.run(["nvidia-prod", "--yes"], rootDir);
    expect(mocks.prompt).not.toHaveBeenCalled();
    expect(mocks.runOpenshellProviderCommand).toHaveBeenCalledWith(
      ["provider", "delete", "nvidia-prod"],
      expect.any(Object),
    );
    expect(console.log).toHaveBeenCalledWith(
      "  Removed provider 'nvidia-prod' from the OpenShell gateway.",
    );
  });

  it("logs error and exits if deletion fails", async () => {
    mocks.runOpenshellProviderCommand.mockReturnValue({ status: 1, stderr: "failed" });
    await expect(CredentialsResetCommand.run(["nvidia-prod", "--yes"], rootDir)).rejects.toThrow(
      "process.exit(1)",
    );
    expect(console.error).toHaveBeenCalledWith("  Could not remove provider 'nvidia-prod'.");
    expect(console.error).toHaveBeenCalledWith("  failed");
  });

  it("gives special error message if user tries to reset an env var name", async () => {
    mocks.runOpenshellProviderCommand.mockReturnValue({ status: 1 });
    await expect(CredentialsResetCommand.run(["NVIDIA_API_KEY", "--yes"], rootDir)).rejects.toThrow(
      "process.exit(1)",
    );
    expect(console.error).toHaveBeenCalledWith("  Could not remove provider 'NVIDIA_API_KEY'.");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("looks like a credential env variable name"),
    );
  });
});
