// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';

export type ProofpackStatus = 'complete' | 'partial' | 'incomplete';

export interface ProofpackEvidence {
  id: string;
  contentHash: string;
  required: boolean;
  partial?: boolean;
}

export interface ProofpackInput {
  id: string;
  replayRef: string;
  policyReplayRef: string;
  evidence: ProofpackEvidence[];
  interrupted?: boolean;
}

export interface ProofpackManifest {
  id: string;
  status: ProofpackStatus;
  replayRef: string;
  policyReplayRef: string;
  evidence: ProofpackEvidence[];
  missingRequiredEvidence: string[];
  integrityHash: string;
  notes: string[];
}

export function buildProofpackManifest(input: ProofpackInput): ProofpackManifest {
  const missingRequiredEvidence = input.evidence
    .filter((item) => item.required && (item.partial || item.contentHash.length === 0))
    .map((item) => item.id);
  const notes: string[] = [];
  if (input.interrupted) notes.push('interrupted_proofpack_marked_partial');
  if (missingRequiredEvidence.length > 0) notes.push('missing_required_evidence_visible');
  if (!input.replayRef) notes.push('missing_replay_reference');
  if (!input.policyReplayRef) notes.push('missing_policy_replay_reference');

  const status: ProofpackStatus =
    missingRequiredEvidence.length > 0 || !input.replayRef || !input.policyReplayRef
      ? 'incomplete'
      : input.interrupted
        ? 'partial'
        : 'complete';
  const integrityHash = createHash('sha256')
    .update(JSON.stringify({ evidence: input.evidence, id: input.id, policyReplayRef: input.policyReplayRef, replayRef: input.replayRef, status }))
    .digest('hex');
  return { ...input, status, missingRequiredEvidence, integrityHash, notes };
}
