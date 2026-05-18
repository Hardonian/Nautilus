// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type FailureCondition =
  | 'runtime_unavailable' | 'retrieval_unavailable' | 'policy_engine_unavailable' | 'memory_store_unavailable'
  | 'trace_store_unavailable' | 'proofpack_generation_unavailable' | 'gpu_telemetry_unavailable' | 'gpu_telemetry_stale'
  | 'local_model_unavailable' | 'distributed_node_offline' | 'event_validation_failure' | 'storage_limit_reached'
  | 'timeout' | 'cancellation' | 'partial_execution_failure';

export const failureSemantics: Record<FailureCondition, { visibleState: string; failBehavior: 'open' | 'closed'; event: string; recovery: string }> = {
  runtime_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'runtime.unavailable', recovery: 'fallback to local or queue retry' },
  retrieval_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'retrieval.unavailable', recovery: 'use degraded retrieval mode with explicit annotation' },
  policy_engine_unavailable: { visibleState: 'failed', failBehavior: 'closed', event: 'policy.unavailable', recovery: 'restore policy engine before retry' },
  memory_store_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'memory.unavailable', recovery: 'continue execution; defer memory write' },
  trace_store_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'trace.unavailable', recovery: 'continue execution; mark proofpack incomplete' },
  proofpack_generation_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'proofpack.unavailable', recovery: 'regenerate proofpack from immutable events' },
  gpu_telemetry_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'telemetry.gpu.unavailable', recovery: 'fallback to runtime health probes' },
  gpu_telemetry_stale: { visibleState: 'degraded', failBehavior: 'open', event: 'telemetry.gpu.stale', recovery: 'invalidate stale metrics and refresh sample' },
  local_model_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'model.local.unavailable', recovery: 'queue or fail over to configured alternative' },
  distributed_node_offline: { visibleState: 'degraded', failBehavior: 'open', event: 'mesh.node.offline', recovery: 'exclude node from placement and retry' },
  event_validation_failure: { visibleState: 'failed', failBehavior: 'closed', event: 'event.validation.failed', recovery: 'reject mutation and fix producer contract' },
  storage_limit_reached: { visibleState: 'degraded', failBehavior: 'open', event: 'storage.limit.reached', recovery: 'prune prunable records and retry write' },
  timeout: { visibleState: 'failed', failBehavior: 'open', event: 'execution.timeout', recovery: 'cancel timed-out execution and allow replay' },
  cancellation: { visibleState: 'cancelled', failBehavior: 'open', event: 'execution.cancelled', recovery: 'submit new execution with new idempotency key' },
  partial_execution_failure: { visibleState: 'degraded', failBehavior: 'open', event: 'execution.partial_failure', recovery: 'complete available steps and emit missing artifacts' },
};
