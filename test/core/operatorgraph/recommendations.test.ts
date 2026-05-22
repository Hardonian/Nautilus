import { describe, it, expect } from 'vitest';
import { validateRecommendationEvidence, Recommendation } from '../../../core/operatorgraph/recommendations.ts';

describe('validateRecommendationEvidence', () => {
  it('should return ok=true when all evidence is available and at least one evidence is required', () => {
    const recommendation: Recommendation = {
      id: 'r1',
      text: 'Rec 1',
      evidenceIds: ['e1', 'e2'],
    };
    const available = ['e1', 'e2', 'e3'];

    const result = validateRecommendationEvidence(recommendation, available);

    expect(result.ok).toBe(true);
    expect(result.missingEvidenceIds).toEqual([]);
  });

  it('should return ok=false when evidence is missing', () => {
    const recommendation: Recommendation = {
      id: 'r1',
      text: 'Rec 1',
      evidenceIds: ['e1', 'e2', 'e4'],
    };
    const available = ['e1', 'e2', 'e3'];

    const result = validateRecommendationEvidence(recommendation, available);

    expect(result.ok).toBe(false);
    expect(result.missingEvidenceIds).toEqual(['e4']);
  });

  it('should return ok=true when no evidence is required by the recommendation', () => {
    const recommendation: Recommendation = {
      id: 'r1',
      text: 'Rec 1',
      evidenceIds: [],
    };
    const available = ['e1', 'e2', 'e3'];

    const result = validateRecommendationEvidence(recommendation, available);

    expect(result.ok).toBe(true);
    expect(result.missingEvidenceIds).toEqual([]);
  });

  it('should return ok=false when multiple pieces of evidence are missing', () => {
    const recommendation: Recommendation = {
      id: 'r1',
      text: 'Rec 1',
      evidenceIds: ['e1', 'e4', 'e5'],
    };
    const available = ['e1', 'e2', 'e3'];

    const result = validateRecommendationEvidence(recommendation, available);

    expect(result.ok).toBe(false);
    expect(result.missingEvidenceIds).toEqual(['e4', 'e5']);
  });
});
