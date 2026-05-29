// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../sandbox-config", () => ({}));

import { printConfigUsageAndExit } from "./get";
import { CLI_NAME } from "../../../cli/branding";

describe("printConfigUsageAndExit", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log usage and exit with code 1", () => {
    expect(() => printConfigUsageAndExit()).toThrow("process.exit called");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `  Usage: ${CLI_NAME} <name> config get [--key dotpath] [--format json|yaml]`
    );

    expect(processExitSpy).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
