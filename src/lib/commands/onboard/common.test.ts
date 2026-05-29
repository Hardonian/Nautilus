// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { buildOnboardFlags, toLegacyOnboardArgs } from "../../../../dist/lib/commands/onboard/common";

describe("onboard flags", () => {
  it("buildOnboardFlags returns correct flags", () => {
    const flags = buildOnboardFlags();
    expect(flags).toBeDefined();
    expect(flags["non-interactive"]).toBeDefined();
    expect(flags["non-interactive"].type).toBe("boolean");
    expect(flags.resume).toBeDefined();
    expect(flags.resume.type).toBe("boolean");
    expect(flags.resume.exclusive).toContain("fresh");
    expect(flags.fresh).toBeDefined();
    expect(flags.fresh.type).toBe("boolean");
    expect(flags.fresh.exclusive).toContain("resume");
    expect(flags["recreate-sandbox"]).toBeDefined();
    expect(flags["recreate-sandbox"].type).toBe("boolean");
    expect(flags.gpu).toBeDefined();
    expect(flags.gpu.type).toBe("boolean");
    expect(flags.gpu.exclusive).toContain("no-gpu");
    expect(flags["no-gpu"]).toBeDefined();
    expect(flags["no-gpu"].type).toBe("boolean");
    expect(flags["no-gpu"].exclusive).toContain("gpu");
    expect(flags.from).toBeDefined();
    expect(flags.from.type).toBe("option");
    expect(flags.name).toBeDefined();
    expect(flags.name.type).toBe("option");
    expect(flags.agent).toBeDefined();
    expect(flags.agent.type).toBe("option");
    expect(flags["control-ui-port"]).toBeDefined();
    expect(flags["control-ui-port"].type).toBe("option");
    expect(flags.yes).toBeDefined();
    expect(flags.yes.type).toBe("boolean");
    expect(flags.yes.char).toBe("y");
    expect(flags["yes-i-accept-third-party-software"]).toBeDefined();
    expect(flags["yes-i-accept-third-party-software"].type).toBe("boolean");
  });

  it("toLegacyOnboardArgs constructs correct args", () => {
    const flags = {
      "non-interactive": true,
      resume: true,
      "recreate-sandbox": true,
      gpu: true,
      from: "path/to/Dockerfile",
      name: "my-sandbox",
      agent: "my-agent",
      "control-ui-port": 8080,
      yes: true,
      "yes-i-accept-third-party-software": true,
    };
    const args = toLegacyOnboardArgs(flags);
    expect(args).toEqual([
      "--non-interactive",
      "--resume",
      "--recreate-sandbox",
      "--gpu",
      "--from",
      "path/to/Dockerfile",
      "--name",
      "my-sandbox",
      "--agent",
      "my-agent",
      "--control-ui-port",
      "8080",
      "--yes",
      "--yes-i-accept-third-party-software",
    ]);
  });

  it("toLegacyOnboardArgs constructs correct args for mutually exclusive alternate flags", () => {
    const flags = {
      fresh: true,
      "no-gpu": true,
    };
    const args = toLegacyOnboardArgs(flags);
    expect(args).toEqual(["--fresh", "--no-gpu"]);
  });
});
