// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface OperatorDecisionRecord {
  decisionId: string;
  operatorId: string;
  contextHash: string;
  actionTaken: string;
  timestampUtc: string;
}

export class OperatorMemory {
  private readonly ledger: OperatorDecisionRecord[] = [];

  public appendDecision(operatorId: string, contextHash: string, actionTaken: string): string {
    const decisionId = `dec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.ledger.push({
      decisionId,
      operatorId,
      contextHash,
      actionTaken,
      timestampUtc: new Date().toISOString(),
    });
    return decisionId;
  }

  public getDecisions(): ReadonlyArray<OperatorDecisionRecord> {
    return this.ledger;
  }
}
