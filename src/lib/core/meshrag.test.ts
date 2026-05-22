// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { rankRetrievalSources, SourceTrustScore } from "./meshrag";

describe("rankRetrievalSources", () => {
  it("sorts by score descending", () => {
    const scores: SourceTrustScore[] = [
      { sourceId: "docB", score: 0.5, rationale: "" },
      { sourceId: "docC", score: 0.8, rationale: "" },
      { sourceId: "docA", score: 0.2, rationale: "" },
    ];
    const ranked = rankRetrievalSources(scores);
    expect(ranked).toEqual([
      { sourceId: "docC", score: 0.8, rationale: "" },
      { sourceId: "docB", score: 0.5, rationale: "" },
      { sourceId: "docA", score: 0.2, rationale: "" },
    ]);
  });

  it("breaks ties by sourceId alphabetically ascending", () => {
    const scores: SourceTrustScore[] = [
      { sourceId: "docB", score: 0.5, rationale: "" },
      { sourceId: "docA", score: 0.5, rationale: "" },
      { sourceId: "docC", score: 0.5, rationale: "" },
    ];
    const ranked = rankRetrievalSources(scores);
    expect(ranked).toEqual([
      { sourceId: "docA", score: 0.5, rationale: "" },
      { sourceId: "docB", score: 0.5, rationale: "" },
      { sourceId: "docC", score: 0.5, rationale: "" },
    ]);
  });

  it("handles empty arrays", () => {
    const scores: SourceTrustScore[] = [];
    const ranked = rankRetrievalSources(scores);
    expect(ranked).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const scores: SourceTrustScore[] = [
      { sourceId: "docB", score: 0.5, rationale: "" },
      { sourceId: "docC", score: 0.8, rationale: "" },
      { sourceId: "docA", score: 0.2, rationale: "" },
    ];
    const originalScores = [...scores];
    rankRetrievalSources(scores);
    expect(scores).toEqual(originalScores);
  });
});
