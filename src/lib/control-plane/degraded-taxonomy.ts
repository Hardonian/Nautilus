// SPDX-License-Identifier: Apache-2.0

export type DegradedSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DegradedSemantics = 'degraded' | 'blocked' | 'partial' | 'unknown';

export type DegradedCauseCode =
  | 'policy_deny'
  | 'policy_ambiguous'
  | 'ssrf_blocked'
  | 'egress_restricted'
  | 'runtime_unavailable'
  | 'fallback_blocked';

export interface DegradedReceipt {
  causeCode: DegradedCauseCode;
  severity: DegradedSeverity;
  semantics: DegradedSemantics;
  operatorMessage: string;
  retryable: boolean;
  recoveryHint: string;
}

export const DEGRADED_TAXONOMY: Record<DegradedCauseCode, Omit<DegradedReceipt, 'causeCode'>> = {
  policy_deny: {
    severity: 'high',
    semantics: 'blocked',
    operatorMessage: 'Policy denied this operation.',
    retryable: false,
    recoveryHint: 'Review policy preset and explicit allow rules.',
  },
  policy_ambiguous: {
    severity: 'high',
    semantics: 'degraded',
    operatorMessage: 'Policy evaluation is ambiguous and failed closed.',
    retryable: false,
    recoveryHint: 'Normalize policy rules to remove ambiguity.',
  },
  ssrf_blocked: {
    severity: 'critical',
    semantics: 'blocked',
    operatorMessage: 'Target blocked by SSRF guardrails.',
    retryable: false,
    recoveryHint: 'Use an approved endpoint and policy preset.',
  },
  egress_restricted: {
    severity: 'high',
    semantics: 'blocked',
    operatorMessage: 'Egress is restricted by sandbox policy.',
    retryable: false,
    recoveryHint: 'Amend policy in approved governance workflow.',
  },
  runtime_unavailable: {
    severity: 'medium',
    semantics: 'degraded',
    operatorMessage: 'Runtime source is unavailable.',
    retryable: true,
    recoveryHint: 'Retry after runtime health recovers.',
  },
  fallback_blocked: {
    severity: 'high',
    semantics: 'blocked',
    operatorMessage: 'Unsafe fallback path blocked to preserve policy posture.',
    retryable: false,
    recoveryHint: 'Restore primary path; fallback does not bypass policy.',
  },
};

export function createDegradedReceipt(causeCode: DegradedCauseCode): DegradedReceipt {
  return { causeCode, ...DEGRADED_TAXONOMY[causeCode] };
}
