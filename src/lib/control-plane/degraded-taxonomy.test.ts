import { describe, expect, it } from 'vitest';
import { DEGRADED_TAXONOMY, createDegradedReceipt } from './degraded-taxonomy';

describe('degraded taxonomy', () => {
  it('creates machine-readable receipts with stable codes', () => {
    const receipt = createDegradedReceipt('policy_ambiguous');
    expect(receipt.causeCode).toBe('policy_ambiguous');
    expect(receipt.semantics).toBe('degraded');
    expect(receipt.operatorMessage.length).toBeGreaterThan(0);
  });

  it('contains no healthy semantics', () => {
    for (const entry of Object.values(DEGRADED_TAXONOMY)) {
      expect(['degraded', 'blocked', 'partial', 'unknown']).toContain(entry.semantics);
    }
  });
});
