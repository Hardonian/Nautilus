// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { toLegacyOnboardArgs } from "../../../../dist/lib/commands/onboard/common.js";
import { NOTICE_ACCEPT_FLAG } from "../../../../dist/lib/onboard/usage-notice.js";
import type { OnboardFlags } from "./common.js";

const acceptFlagName = NOTICE_ACCEPT_FLAG.replace(/^--/, "");

describe("toLegacyOnboardArgs", () => {
  it("should return an empty array when no flags are provided", () => {
    const flags: OnboardFlags = {};
    const args = toLegacyOnboardArgs(flags);
    expect(args).toEqual([]);
  });

  it("should handle single boolean flags", () => {
    expect(toLegacyOnboardArgs({ "non-interactive": true })).toEqual(["--non-interactive"]);
    expect(toLegacyOnboardArgs({ resume: true })).toEqual(["--resume"]);
    expect(toLegacyOnboardArgs({ fresh: true })).toEqual(["--fresh"]);
    expect(toLegacyOnboardArgs({ "recreate-sandbox": true })).toEqual(["--recreate-sandbox"]);
    expect(toLegacyOnboardArgs({ gpu: true })).toEqual(["--gpu"]);
    expect(toLegacyOnboardArgs({ "no-gpu": true })).toEqual(["--no-gpu"]);
    expect(toLegacyOnboardArgs({ yes: true })).toEqual(["--yes"]);
  });

  it("should not include boolean flags when they are false", () => {
    expect(toLegacyOnboardArgs({ resume: false })).toEqual([]);
  });

  it("should handle string and numeric flags", () => {
    expect(toLegacyOnboardArgs({ from: "./Dockerfile" })).toEqual(["--from", "./Dockerfile"]);
    expect(toLegacyOnboardArgs({ name: "my-sandbox" })).toEqual(["--name", "my-sandbox"]);
    expect(toLegacyOnboardArgs({ agent: "my-agent" })).toEqual(["--agent", "my-agent"]);
    expect(toLegacyOnboardArgs({ "control-ui-port": 8080 })).toEqual(["--control-ui-port", "8080"]);
  });

  it("should handle the third-party software usage notice flag", () => {
    expect(toLegacyOnboardArgs({ [acceptFlagName]: true })).toEqual([NOTICE_ACCEPT_FLAG]);
    expect(toLegacyOnboardArgs({ [acceptFlagName]: false })).toEqual([]);
  });

  it("should process a combination of multiple flags correctly", () => {
    const flags: OnboardFlags = {
      "non-interactive": true,
      name: "combined-sandbox",
      "control-ui-port": 9090,
      yes: true,
      [acceptFlagName]: true,
    };
    const args = toLegacyOnboardArgs(flags);
    expect(args).toEqual([
      "--non-interactive",
      "--name",
      "combined-sandbox",
      "--control-ui-port",
      "9090",
      "--yes",
      NOTICE_ACCEPT_FLAG,
    ]);
  });
});
