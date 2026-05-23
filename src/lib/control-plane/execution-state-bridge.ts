// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { QueueStatus } from "../execution/types";
import { type ExecutionState as ControlPlaneState } from "./execution-state-machine";
export type ContractState = "queued" | "planning" | "policy_evaluation" | "retrieval" | "executing" | "fallback" | "degraded" | "completed" | "failed" | "cancelled" | "replaying";

export function mapQueueStatusToExecutionState(status: QueueStatus): ControlPlaneState {
  switch (status) {
    case QueueStatus.PENDING:
      return "observed";
    case QueueStatus.QUEUED:
      return "queued";
    case QueueStatus.RUNNING:
      return "executing";
    case QueueStatus.COMPLETED:
      return "completed";
    case QueueStatus.FAILED:
    case QueueStatus.DEAD_LETTER:
      return "failed";
    case QueueStatus.CANCELLED:
      return "cancelled";
    case QueueStatus.BLOCKED:
      return "blocked";
    default:
      return "failed";
  }
}

export function mapExecutionStateToContractState(state: ControlPlaneState): ContractState {
  switch (state) {
    case "observed":
    case "queued":
      return "queued";
    case "planned":
      return "planning";
    case "leased":
    case "executing":
      return "executing";
    case "completed":
    case "proofpack_exported":
      return "completed";
    case "failed":
    case "blocked":
    case "expired":
    case "replay_invalid":
      return "failed";
    case "degraded":
      return "degraded";
    case "cancelled":
      return "cancelled";
    case "replay_valid":
      return "replaying";
    default:
      return "failed";
  }
}

export function emitStateMappingReceipt(
  lineageId: string,
  queueStatus: QueueStatus,
  controlState: ControlPlaneState,
  contractState: ContractState
): Record<string, string> {
  return {
    id: `receipt-${lineageId}-state-mapping`,
    type: "state_mapping",
    queueStatus,
    controlState,
    contractState,
    atIso: new Date().toISOString(),
  };
}
