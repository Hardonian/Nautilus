// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prompt: vi.fn(),
  recoverGatewayOrExit: vi.fn(),
  isBridgeProviderName: vi.fn(),
}));

vi.mock("../../credentials/store", () => ({ prompt: mocks.prompt }));
vi.mock("./common", () => ({
  isBridgeProviderName: mocks.isBridgeProviderName,
  recoverGatewayOrExit: mocks.recoverGatewayOrExit,
}));

import { resetProviderCredentials } from "../../../cli/commands/credentials/reset";
import CredentialsResetCommand from "./reset";
import { CLI_NAME } from "../../cli/branding";

vi.mock("../../../cli/commands/credentials/reset", () => ({
  resetProviderCredentials: vi.fn(),
}));

class ProcessExitError extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
  }
}

describe("CredentialsResetCommand unit tests", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new ProcessExitError(typeof code === "number" ? code : 1);
    });

    mocks.recoverGatewayOrExit.mockResolvedValue(undefined);
    mocks.isBridgeProviderName.mockReturnValue(false);
  });

  it("exits and logs error if provider arg is missing or starts with '-'", async () => {
    // Missing provider
    await expect(CredentialsResetCommand.run([])).rejects.toThrow(ProcessExitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Usage: nemoclaw credentials reset <PROVIDER> [--yes]"));

    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new ProcessExitError(typeof code === "number" ? code : 1);
    });

    // Invalid provider (oclif catches unknown flag in strict mode)
    await expect(CredentialsResetCommand.run(["--invalid"])).rejects.toThrow();
  });

  it("exits and logs error if provider is a bridge provider name", async () => {
    mocks.isBridgeProviderName.mockReturnValue(true);

    await expect(CredentialsResetCommand.run(["bridge-name"])).rejects.toThrow(ProcessExitError);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("'bridge-name' is a per-sandbox messaging bridge, not a credential."));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("channels remove"));
  });

  it("logs 'Cancelled' and returns if user declines the prompt", async () => {
    mocks.prompt.mockResolvedValue("N");

    await CredentialsResetCommand.run(["nvidia-prod"]);

    expect(mocks.prompt).toHaveBeenCalled();
    expect(resetProviderCredentials).not.toHaveBeenCalled();

    const logged = logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("");
    expect(logged).toContain("Cancelled.");
  });

  it("proceeds to remove credential if user accepts prompt", async () => {
    mocks.prompt.mockResolvedValue("yes");
    vi.mocked(resetProviderCredentials).mockReturnValue({ success: true });

    await CredentialsResetCommand.run(["nvidia-prod"]);

    expect(mocks.recoverGatewayOrExit).toHaveBeenCalledWith("reach");
    expect(resetProviderCredentials).toHaveBeenCalledWith("nvidia-prod");

    const logged = logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("");
    expect(logged).toContain("Removed provider 'nvidia-prod'");
  });

  it("skips prompt and proceeds if --yes flag is provided", async () => {
    vi.mocked(resetProviderCredentials).mockReturnValue({ success: true });

    await CredentialsResetCommand.run(["nvidia-prod", "--yes"]);

    expect(mocks.prompt).not.toHaveBeenCalled();
    expect(mocks.recoverGatewayOrExit).toHaveBeenCalledWith("reach");
    expect(resetProviderCredentials).toHaveBeenCalledWith("nvidia-prod");

    const logged = logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("");
    expect(logged).toContain("Removed provider 'nvidia-prod'");
  });

  it("exits and logs error if gateway removal fails", async () => {
    vi.mocked(resetProviderCredentials).mockReturnValue({ success: false, stderr: "gateway error" });

    await expect(CredentialsResetCommand.run(["nvidia-prod", "--yes"])).rejects.toThrow(ProcessExitError);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Could not remove provider 'nvidia-prod'."));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("gateway error"));
  });

  it("provides helpful tip if provider name looks like an env var on failure", async () => {
    vi.mocked(resetProviderCredentials).mockReturnValue({ success: false });

    await expect(CredentialsResetCommand.run(["NVIDIA_API_KEY", "--yes"])).rejects.toThrow(ProcessExitError);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Could not remove provider 'NVIDIA_API_KEY'."));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("'NVIDIA_API_KEY' looks like a credential env variable name."));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(`Run '${CLI_NAME} credentials list' to see`));
  });
});
