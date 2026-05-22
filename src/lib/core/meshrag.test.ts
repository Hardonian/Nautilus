// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  InMemorySemanticCache,
  RetrievalResult
} from "../../../dist/lib/core/meshrag";

describe("InMemorySemanticCache", () => {
  it("returns cache miss when key is not found", () => {
    const cache = new InMemorySemanticCache();
    const result = cache.get("non-existent-key");

    expect(result).toEqual({ key: "non-existent-key", reason: "not_found" });
  });

  it("returns cache hit when key is found", () => {
    const cache = new InMemorySemanticCache();
    const mockResult: RetrievalResult = {
      requestId: "req-1",
      evidence: [],
      trust: []
    };

    cache.put("my-key", mockResult);
    const result = cache.get("my-key");

    expect(result).toEqual({ key: "my-key", value: mockResult });
  });

  it("can overwrite existing keys", () => {
    const cache = new InMemorySemanticCache();
    const mockResult1: RetrievalResult = { requestId: "req-1", evidence: [], trust: [] };
    const mockResult2: RetrievalResult = { requestId: "req-2", evidence: [], trust: [] };

    cache.put("my-key", mockResult1);
    cache.put("my-key", mockResult2);

    const result = cache.get("my-key");
    expect(result).toEqual({ key: "my-key", value: mockResult2 });
  });
});
