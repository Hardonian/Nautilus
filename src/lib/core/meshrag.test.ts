// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { InMemorySemanticCache, rankRetrievalSources, type RetrievalResult } from "./meshrag";

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

  it("overwrites existing value on put", () => {
    const cache = new InMemorySemanticCache();
    const mockResult1: RetrievalResult = { requestId: "req-1", evidence: [], trust: [] };
    const mockResult2: RetrievalResult = { requestId: "req-2", evidence: [], trust: [] };

    cache.put("my-key", mockResult1);
    cache.put("my-key", mockResult2);

    const result = cache.get("my-key");
    expect(result).toEqual({ key: "my-key", value: mockResult2 });
  });
});

describe("rankRetrievalSources", () => {
  it("sorts by score in descending order", () => {
    const scores = [
      { sourceId: "b", score: 0.5, rationale: "" },
      { sourceId: "a", score: 0.9, rationale: "" },
      { sourceId: "c", score: 0.2, rationale: "" },
    ];
    const ranked = rankRetrievalSources(scores);
    expect(ranked.map(s => s.sourceId)).toEqual(["a", "b", "c"]);
  });

  it("sorts by sourceId alphabetically when scores are equal", () => {
    const scores = [
      { sourceId: "b", score: 0.5, rationale: "" },
      { sourceId: "a", score: 0.5, rationale: "" },
      { sourceId: "c", score: 0.5, rationale: "" },
    ];
    const ranked = rankRetrievalSources(scores);
    expect(ranked.map(s => s.sourceId)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the original array", () => {
    const scores = [
      { sourceId: "b", score: 0.5, rationale: "" },
      { sourceId: "a", score: 0.9, rationale: "" },
    ];
    rankRetrievalSources(scores);
    expect(scores[0].sourceId).toBe("b");
  });
});
