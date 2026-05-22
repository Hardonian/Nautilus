// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { rankRetrievalSources } from "./meshrag";

describe("rankRetrievalSources", () => {
  it("sorts by score in descending order", () => {
    const scores = [
      { sourceId: "a", score: 0.5, rationale: "" },
      { sourceId: "b", score: 0.9, rationale: "" },
      { sourceId: "c", score: 0.1, rationale: "" },
    ];
    const result = rankRetrievalSources(scores);
    expect(result.map(r => r.sourceId)).toEqual(["b", "a", "c"]);
  });

  it("breaks ties using sourceId alphabetically", () => {
    const scores = [
      { sourceId: "c", score: 0.5, rationale: "" },
      { sourceId: "a", score: 0.5, rationale: "" },
      { sourceId: "b", score: 0.5, rationale: "" },
    ];
    const result = rankRetrievalSources(scores);
    expect(result.map(r => r.sourceId)).toEqual(["a", "b", "c"]);
  });

  it("handles a mix of scores and alphabetical ties", () => {
    const scores = [
      { sourceId: "b", score: 0.5, rationale: "" },
      { sourceId: "a", score: 0.8, rationale: "" },
      { sourceId: "c", score: 0.5, rationale: "" },
      { sourceId: "d", score: 0.8, rationale: "" },
    ];
    const result = rankRetrievalSources(scores);
    expect(result.map(r => r.sourceId)).toEqual(["a", "d", "b", "c"]);
  });

  it("does not mutate the original array", () => {
    const scores = [
      { sourceId: "b", score: 0.5, rationale: "" },
      { sourceId: "a", score: 0.8, rationale: "" },
    ];
    rankRetrievalSources(scores);
    expect(scores[0].sourceId).toBe("b");
    expect(scores[1].sourceId).toBe("a");
  });

  it("handles an empty array", () => {
    expect(rankRetrievalSources([])).toEqual([]);
  });

  it("handles a single element array", () => {
    const scores = [{ sourceId: "a", score: 0.5, rationale: "" }];
    expect(rankRetrievalSources(scores)).toEqual(scores);
  });
});
