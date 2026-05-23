// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySemanticCache, type RetrievalResult } from "./meshrag";

describe("InMemorySemanticCache", () => {
  let cache: InMemorySemanticCache;

  beforeEach(() => {
    cache = new InMemorySemanticCache();
  });

  it("should return a cache miss for an unknown key", () => {
    const result = cache.get("unknown-key");
    expect(result).toEqual({ key: "unknown-key", reason: "not_found" });
  });

  it("should return a cache hit after putting a value", () => {
    const key = "test-query";
    const value: RetrievalResult = {
      requestId: "req-1",
      evidence: [{ sourceId: "doc-1" }],
      trust: [{ sourceId: "doc-1", score: 0.9, rationale: "good" }],
    };

    cache.put(key, value);

    const result = cache.get(key);
    expect(result).toEqual({ key, value });
  });

  it("should overwrite an existing value for the same key", () => {
    const key = "test-query";
    const value1: RetrievalResult = {
      requestId: "req-1",
      evidence: [{ sourceId: "doc-1" }],
      trust: [{ sourceId: "doc-1", score: 0.9, rationale: "good" }],
    };
    const value2: RetrievalResult = {
      requestId: "req-2",
      evidence: [{ sourceId: "doc-2" }],
      trust: [{ sourceId: "doc-2", score: 0.8, rationale: "okay" }],
    };

    cache.put(key, value1);
    cache.put(key, value2);

    const result = cache.get(key);
    expect(result).toEqual({ key, value: value2 });
  });
});
