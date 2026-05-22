import { describe, expect, it } from "vitest";
import { rankRetrievalSources, type SourceTrustScore } from "./meshrag.js";

describe("rankRetrievalSources", () => {
  it("sorts by score in descending order", () => {
    const scores: SourceTrustScore[] = [
      { sourceId: "a", score: 0.5, rationale: "" },
      { sourceId: "b", score: 0.9, rationale: "" },
      { sourceId: "c", score: 0.1, rationale: "" },
    ];
    const result = rankRetrievalSources(scores);
    expect(result).toEqual([
      { sourceId: "b", score: 0.9, rationale: "" },
      { sourceId: "a", score: 0.5, rationale: "" },
      { sourceId: "c", score: 0.1, rationale: "" },
    ]);
  });

  it("breaks ties by sourceId in alphabetical order", () => {
    const scores: SourceTrustScore[] = [
      { sourceId: "c", score: 0.8, rationale: "" },
      { sourceId: "a", score: 0.8, rationale: "" },
      { sourceId: "b", score: 0.8, rationale: "" },
    ];
    const result = rankRetrievalSources(scores);
    expect(result).toEqual([
      { sourceId: "a", score: 0.8, rationale: "" },
      { sourceId: "b", score: 0.8, rationale: "" },
      { sourceId: "c", score: 0.8, rationale: "" },
    ]);
  });

  it("handles an empty array", () => {
    expect(rankRetrievalSources([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const scores: SourceTrustScore[] = [
      { sourceId: "b", score: 0.5, rationale: "" },
      { sourceId: "a", score: 0.8, rationale: "" },
    ];
    const originalScores = [...scores];
    rankRetrievalSources(scores);
    expect(scores).toEqual(originalScores);
  });
});
