// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface Recommendation {
  id: string;
  text: string;
  evidenceIds: string[];
}

export function validateRecommendationEvidence(recommendation: Recommendation, availableEvidenceIds: string[]): { ok: boolean; missingEvidenceIds: string[] } {
  const available = new Set(availableEvidenceIds);
  const missingEvidenceIds = recommendation.evidenceIds.filter((id) => !available.has(id));
  return { ok: missingEvidenceIds.length === 0, missingEvidenceIds };
}
