// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { rankRetrievalSources, type SourceTrustScore } from "./meshrag";

describe("rankRetrievalSources", () => {
  it("returns an empty array when given an empty array", () => {
    expect(rankRetrievalSources([])).toEqual([]);
  });

  it("handles a single element array", () => {
    const input: SourceTrustScore[] = [{ sourceId: "a", score: 0.5, rationale: "" }];
    expect(rankRetrievalSources(input)).toEqual(input);
  });

  it("sorts primarily by score in descending order", () => {
    const input: SourceTrustScore[] = [
      { sourceId: "c", score: 0.2, rationale: "" },
      { sourceId: "a", score: 0.8, rationale: "" },
      { sourceId: "b", score: 0.5, rationale: "" },
    ];
    const expected: SourceTrustScore[] = [
      { sourceId: "a", score: 0.8, rationale: "" },
      { sourceId: "b", score: 0.5, rationale: "" },
      { sourceId: "c", score: 0.2, rationale: "" },
    ];
    expect(rankRetrievalSources(input)).toEqual(expected);
  });

  it("tie-breaks by sourceId alphabetically ascending when scores are equal", () => {
    const input: SourceTrustScore[] = [
      { sourceId: "c", score: 0.5, rationale: "" },
      { sourceId: "a", score: 0.5, rationale: "" },
      { sourceId: "b", score: 0.5, rationale: "" },
    ];
    const expected: SourceTrustScore[] = [
      { sourceId: "a", score: 0.5, rationale: "" },
      { sourceId: "b", score: 0.5, rationale: "" },
      { sourceId: "c", score: 0.5, rationale: "" },
    ];
    expect(rankRetrievalSources(input)).toEqual(expected);
  });

  it("returns a new array and does not mutate the original array", () => {
    const input: SourceTrustScore[] = [
      { sourceId: "b", score: 0.2, rationale: "" },
      { sourceId: "a", score: 0.8, rationale: "" },
    ];
    const originalInput = [...input];
    const result = rankRetrievalSources(input);

    expect(result).not.toBe(input);
    expect(input).toEqual(originalInput);
  });
});
