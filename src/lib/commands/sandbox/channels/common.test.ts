// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Vitest mock for the require
vi.mock("../../../../lib/actions/sandbox/policy-channel", () => {
  return {
    addSandboxChannel: vi.fn(),
    removeSandboxChannel: vi.fn(),
    startSandboxChannel: vi.fn(),
    stopSandboxChannel: vi.fn(),
  };
});

describe("getChannelsRuntimeBridge", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the default runtime bridge factory mapping to policy-channel actions", async () => {
    const { getChannelsRuntimeBridge } = await import("./common");

    try {
      const result = getChannelsRuntimeBridge();
      expect(result).toBeDefined();
      expect(typeof result.sandboxChannelsAdd).toBe("function");
    } catch (e: any) {
      expect(e.message).toContain("policy-channel");
    }
  });

  it("returns the mocked runtime bridge factory when set via setChannelsRuntimeBridgeFactoryForTest", async () => {
    const { getChannelsRuntimeBridge, setChannelsRuntimeBridgeFactoryForTest } = await import("./common");

    const mockRuntime = {
      sandboxChannelsAdd: vi.fn(),
      sandboxChannelsRemove: vi.fn(),
      sandboxChannelsStart: vi.fn(),
      sandboxChannelsStop: vi.fn(),
    };

    setChannelsRuntimeBridgeFactoryForTest(() => mockRuntime);

    const result = getChannelsRuntimeBridge();
    expect(result).toBe(mockRuntime);
  });
});

describe("buildChannelArgs", () => {
  it("builds empty args when no channel and no flags", async () => {
    const { buildChannelArgs } = await import("./common");
    const result = buildChannelArgs(undefined, {});
    expect(result).toEqual([]);
  });

  it("adds channel argument", async () => {
    const { buildChannelArgs } = await import("./common");
    const result = buildChannelArgs("discord", {});
    expect(result).toEqual(["discord"]);
  });

  it("adds dry-run flag", async () => {
    const { buildChannelArgs } = await import("./common");
    const result = buildChannelArgs(undefined, { "dry-run": true });
    expect(result).toEqual(["--dry-run"]);
  });

  it("adds both channel and dry-run flag", async () => {
    const { buildChannelArgs } = await import("./common");
    const result = buildChannelArgs("discord", { "dry-run": true });
    expect(result).toEqual(["discord", "--dry-run"]);
  });
});
