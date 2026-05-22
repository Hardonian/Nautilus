// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildProofpackManifest, type ProofpackInput } from "./proofpack";

describe("buildProofpackManifest", () => {
  it("creates a complete manifest when all inputs are valid", () => {
    const input: ProofpackInput = {
      id: "proof-123",
      replayRef: "replay-abc",
      policyReplayRef: "policy-abc",
      evidence: [
        { id: "ev-1", contentHash: "hash-1", required: true },
        { id: "ev-2", contentHash: "hash-2", required: false },
      ],
    };

    const result = buildProofpackManifest(input);

    expect(result.status).toBe("complete");
    expect(result.missingRequiredEvidence).toEqual([]);
    expect(result.notes).toEqual([]);
    expect(result.id).toBe("proof-123");
    expect(result.replayRef).toBe("replay-abc");
    expect(result.policyReplayRef).toBe("policy-abc");
    expect(result.evidence).toEqual(input.evidence);

    const expectedHash = createHash("sha256")
      .update(
        JSON.stringify({
          evidence: input.evidence,
          id: input.id,
          policyReplayRef: input.policyReplayRef,
          replayRef: input.replayRef,
          status: "complete",
        }),
      )
      .digest("hex");
    expect(result.integrityHash).toBe(expectedHash);
  });

  it("marks status as incomplete when required evidence is missing (empty contentHash)", () => {
    const input: ProofpackInput = {
      id: "proof-123",
      replayRef: "replay-abc",
      policyReplayRef: "policy-abc",
      evidence: [
        { id: "ev-1", contentHash: "", required: true },
        { id: "ev-2", contentHash: "hash-2", required: false },
      ],
    };

    const result = buildProofpackManifest(input);

    expect(result.status).toBe("incomplete");
    expect(result.missingRequiredEvidence).toEqual(["ev-1"]);
    expect(result.notes).toContain("missing_required_evidence_visible");
  });

  it("marks status as incomplete when required evidence is partial", () => {
    const input: ProofpackInput = {
      id: "proof-123",
      replayRef: "replay-abc",
      policyReplayRef: "policy-abc",
      evidence: [{ id: "ev-1", contentHash: "hash-1", required: true, partial: true }],
    };

    const result = buildProofpackManifest(input);

    expect(result.status).toBe("incomplete");
    expect(result.missingRequiredEvidence).toEqual(["ev-1"]);
    expect(result.notes).toContain("missing_required_evidence_visible");
  });

  it("marks status as incomplete when replayRef is missing", () => {
    const input: ProofpackInput = {
      id: "proof-123",
      replayRef: "",
      policyReplayRef: "policy-abc",
      evidence: [{ id: "ev-1", contentHash: "hash-1", required: true }],
    };

    const result = buildProofpackManifest(input);

    expect(result.status).toBe("incomplete");
    expect(result.notes).toContain("missing_replay_reference");
  });

  it("marks status as incomplete when policyReplayRef is missing", () => {
    const input: ProofpackInput = {
      id: "proof-123",
      replayRef: "replay-abc",
      policyReplayRef: "",
      evidence: [{ id: "ev-1", contentHash: "hash-1", required: true }],
    };

    const result = buildProofpackManifest(input);

    expect(result.status).toBe("incomplete");
    expect(result.notes).toContain("missing_policy_replay_reference");
  });

  it("marks status as partial when interrupted is true and no other issues exist", () => {
    const input: ProofpackInput = {
      id: "proof-123",
      replayRef: "replay-abc",
      policyReplayRef: "policy-abc",
      evidence: [{ id: "ev-1", contentHash: "hash-1", required: true }],
      interrupted: true,
    };

    const result = buildProofpackManifest(input);

    expect(result.status).toBe("partial");
    expect(result.notes).toContain("interrupted_proofpack_marked_partial");
  });

  it("prioritizes incomplete status over partial if interrupted is true but evidence is missing", () => {
    const input: ProofpackInput = {
      id: "proof-123",
      replayRef: "replay-abc",
      policyReplayRef: "policy-abc",
      evidence: [{ id: "ev-1", contentHash: "", required: true }],
      interrupted: true,
    };

    const result = buildProofpackManifest(input);

    expect(result.status).toBe("incomplete");
    expect(result.notes).toContain("interrupted_proofpack_marked_partial");
    expect(result.notes).toContain("missing_required_evidence_visible");
  });

  it("generates a consistent integrity hash based on inputs", () => {
    const input1: ProofpackInput = {
      id: "proof-123",
      replayRef: "replay-abc",
      policyReplayRef: "policy-abc",
      evidence: [{ id: "ev-1", contentHash: "hash-1", required: true }],
    };

    const input2: ProofpackInput = {
      ...input1,
      id: "proof-999",
    };

    const result1 = buildProofpackManifest(input1);
    const result2 = buildProofpackManifest(input2);

    expect(result1.integrityHash).not.toBe(result2.integrityHash);

    // Recomputing manually should match
    const manualHash1 = createHash("sha256")
      .update(
        JSON.stringify({
          evidence: input1.evidence,
          id: input1.id,
          policyReplayRef: input1.policyReplayRef,
          replayRef: input1.replayRef,
          status: "complete",
        }),
      )
      .digest("hex");

    expect(result1.integrityHash).toBe(manualHash1);
  });
});
