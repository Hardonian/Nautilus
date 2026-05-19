// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { RequestEnvelope } from '../runtime/request.js';

export interface PolicyEvaluationResult {
  decision: 'allow' | 'deny';
  reason: string;
}

export class PolicyEngine {
  public evaluateRequest(request: RequestEnvelope): PolicyEvaluationResult {
    // Scaffold: fail-closed by default unless explicitly allowed.
    if (!request.intent) {
      return { decision: 'deny', reason: 'Missing intent' };
    }
    
    // Explicit deny rules
    if (request.constraints.requiresGpu && request.constraints.allowedRegions?.includes('untrusted')) {
      return { decision: 'deny', reason: 'Untrusted region requested for GPU' };
    }

    return { decision: 'allow', reason: 'Default allow for valid intents in trusted perimeter' };
  }
}

export class ApprovalGate {
  private readonly policyEngine: PolicyEngine;

  constructor(policyEngine: PolicyEngine) {
    this.policyEngine = policyEngine;
  }

  public async evaluateGate(request: RequestEnvelope): Promise<PolicyEvaluationResult> {
    const result = this.policyEngine.evaluateRequest(request);
    
    // Scaffold: if denied, we fail-closed immediately.
    // If allowed, we could trigger secondary approval flows here.
    return result;
  }
}
