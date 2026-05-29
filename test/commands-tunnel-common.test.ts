// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { serviceDeps } from "../src/lib/commands/tunnel/common.js";
import * as registry from "../src/lib/state/registry.js";

vi.mock("../src/lib/state/registry.js", () => ({
  listSandboxes: vi.fn(),
}));

describe("tunnel common serviceDeps", () => {
  it("listSandboxes delegates to registry.listSandboxes", async () => {
    const deps = serviceDeps();

    // Configure mock to return something distinguishable
    const mockSandboxes = [{ name: "test-sandbox" }];
    vi.mocked(registry.listSandboxes).mockResolvedValue(mockSandboxes as any);

    const result = await deps.listSandboxes();

    expect(registry.listSandboxes).toHaveBeenCalledOnce();
    expect(result).toBe(mockSandboxes);
  });
});
