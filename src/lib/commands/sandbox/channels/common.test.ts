// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import {
  setChannelsRuntimeBridgeFactoryForTest,
  getChannelsRuntimeBridge,
  buildChannelArgs,
} from "./common";

describe("sandbox channels common", () => {
  describe("ChannelsRuntimeBridge", () => {
    it("can set and get the runtime bridge factory", () => {
      const mockRuntimeBridge = {
        sandboxChannelsAdd: vi.fn(),
        sandboxChannelsRemove: vi.fn(),
        sandboxChannelsStart: vi.fn(),
        sandboxChannelsStop: vi.fn(),
      };

      const mockFactory = vi.fn().mockReturnValue(mockRuntimeBridge);

      setChannelsRuntimeBridgeFactoryForTest(mockFactory);

      const bridge = getChannelsRuntimeBridge();

      expect(mockFactory).toHaveBeenCalled();
      expect(bridge).toBe(mockRuntimeBridge);
    });
  });

  describe("buildChannelArgs", () => {
    it("returns empty args when channel is undefined and no flags are set", () => {
      const args = buildChannelArgs(undefined, {});
      expect(args).toEqual([]);
    });

    it("adds channel to args when channel is provided", () => {
      const args = buildChannelArgs("slack", {});
      expect(args).toEqual(["slack"]);
    });

    it("adds --dry-run flag to args when dry-run is true", () => {
      const args = buildChannelArgs(undefined, { "dry-run": true });
      expect(args).toEqual(["--dry-run"]);
    });

    it("adds both channel and --dry-run flag when both are provided", () => {
      const args = buildChannelArgs("telegram", { "dry-run": true });
      expect(args).toEqual(["telegram", "--dry-run"]);
    });
  });
});
