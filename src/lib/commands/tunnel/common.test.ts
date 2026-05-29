// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { serviceDeps } from "./common";

const mocks = vi.hoisted(() => ({
  listSandboxes: vi.fn(),
}));

vi.mock("../../state/registry", () => ({
  listSandboxes: mocks.listSandboxes,
}));

describe("serviceDeps", () => {
  it("should return an object with listSandboxes function that calls registry.listSandboxes", () => {
    const deps = serviceDeps();
    expect(typeof deps.listSandboxes).toBe("function");

    const mockResponse = { sandboxes: [], defaultSandbox: null };
    mocks.listSandboxes.mockReturnValueOnce(mockResponse);

    const result = deps.listSandboxes();

    expect(mocks.listSandboxes).toHaveBeenCalledOnce();
    expect(result).toBe(mockResponse);
  });
});
