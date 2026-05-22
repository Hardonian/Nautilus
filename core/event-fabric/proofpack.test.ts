// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { buildProofpackManifest, ProofpackInput } from './proofpack.js';

describe('buildProofpackManifest', () => {
  it('should return a complete manifest when input is valid', () => {
    const input: ProofpackInput = {
      id: 'pp-123',
      replayRef: 'rr-456',
      policyReplayRef: 'prr-789',
      evidence: [
        { id: 'ev-1', contentHash: 'hash1', required: true },
        { id: 'ev-2', contentHash: 'hash2', required: false, partial: true },
      ],
    };
    const result = buildProofpackManifest(input);
    expect(result.status).toBe('complete');
    expect(result.missingRequiredEvidence).toHaveLength(0);
    expect(result.notes).toHaveLength(0);
    expect(result.integrityHash).toBeTypeOf('string');
  });

  it('should mark status as partial and add notes if interrupted', () => {
    const input: ProofpackInput = {
      id: 'pp-123',
      replayRef: 'rr-456',
      policyReplayRef: 'prr-789',
      interrupted: true,
      evidence: [
        { id: 'ev-1', contentHash: 'hash1', required: true },
      ],
    };
    const result = buildProofpackManifest(input);
    expect(result.status).toBe('partial');
    expect(result.notes).toContain('interrupted_proofpack_marked_partial');
  });

  it('should identify missing required evidence when contentHash is empty', () => {
    const input: ProofpackInput = {
      id: 'pp-123',
      replayRef: 'rr-456',
      policyReplayRef: 'prr-789',
      evidence: [
        { id: 'ev-1', contentHash: '', required: true },
      ],
    };
    const result = buildProofpackManifest(input);
    expect(result.status).toBe('incomplete');
    expect(result.missingRequiredEvidence).toContain('ev-1');
    expect(result.notes).toContain('missing_required_evidence_visible');
  });

  it('should identify missing required evidence when evidence is partial', () => {
    const input: ProofpackInput = {
      id: 'pp-123',
      replayRef: 'rr-456',
      policyReplayRef: 'prr-789',
      evidence: [
        { id: 'ev-1', contentHash: 'hash1', required: true, partial: true },
      ],
    };
    const result = buildProofpackManifest(input);
    expect(result.status).toBe('incomplete');
    expect(result.missingRequiredEvidence).toContain('ev-1');
  });

  it('should not complain about missing optional evidence', () => {
    const input: ProofpackInput = {
      id: 'pp-123',
      replayRef: 'rr-456',
      policyReplayRef: 'prr-789',
      evidence: [
        { id: 'ev-1', contentHash: '', required: false },
        { id: 'ev-2', contentHash: 'hash', required: false, partial: true },
      ],
    };
    const result = buildProofpackManifest(input);
    expect(result.status).toBe('complete');
    expect(result.missingRequiredEvidence).toHaveLength(0);
  });

  it('should handle missing replayRef', () => {
    const input: ProofpackInput = {
      id: 'pp-123',
      replayRef: '',
      policyReplayRef: 'prr-789',
      evidence: [],
    };
    const result = buildProofpackManifest(input);
    expect(result.status).toBe('incomplete');
    expect(result.notes).toContain('missing_replay_reference');
  });

  it('should handle missing policyReplayRef', () => {
    const input: ProofpackInput = {
      id: 'pp-123',
      replayRef: 'rr-456',
      policyReplayRef: '',
      evidence: [],
    };
    const result = buildProofpackManifest(input);
    expect(result.status).toBe('incomplete');
    expect(result.notes).toContain('missing_policy_replay_reference');
  });

  it('should generate a consistent integrityHash for identical inputs', () => {
    const input: ProofpackInput = {
      id: 'pp-123',
      replayRef: 'rr-456',
      policyReplayRef: 'prr-789',
      evidence: [],
    };
    const result1 = buildProofpackManifest(input);
    const result2 = buildProofpackManifest(input);
    expect(result1.integrityHash).toBe(result2.integrityHash);
  });
});
