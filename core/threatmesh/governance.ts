// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type GovernanceDecision = 'allow' | 'deny';

export interface GovernanceInput {
  policyLoaded: boolean;
  replayRef?: string;
  requestedAction: string;
  allowedActions: string[];
}

export function evaluateGovernance(input: GovernanceInput): { decision: GovernanceDecision; reason: string } {
  if (!input.policyLoaded) return { decision: 'deny', reason: 'policy_unavailable_fail_closed' };
  if (!input.replayRef) return { decision: 'deny', reason: 'missing_policy_replay_reference' };
  if (!input.allowedActions.includes(input.requestedAction)) return { decision: 'deny', reason: 'action_not_allowed' };
  return { decision: 'allow', reason: 'policy_allow_with_replay_reference' };
}
