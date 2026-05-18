// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type FailureCondition =
  | 'runtime_unavailable' | 'retrieval_unavailable' | 'policy_engine_unavailable' | 'memory_store_unavailable'
  | 'trace_store_unavailable' | 'proofpack_generation_unavailable' | 'gpu_telemetry_unavailable' | 'gpu_telemetry_stale'
  | 'local_model_unavailable' | 'distributed_node_offline' | 'event_validation_failure' | 'storage_limit_reached'
  | 'timeout' | 'cancellation' | 'partial_execution_failure';

export interface FailureSemantic {
  visibleState: 'degraded' | 'failed' | 'cancelled';
  failBehavior: 'open' | 'closed';
  event: string;
  traceBehavior: string;
  memoryBehavior: string;
  proofpackBehavior: string;
  recovery: string;
  coverageMarker: string;
}

export const failureSemantics: Record<FailureCondition, FailureSemantic> = {
  runtime_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'runtime.unavailable', traceBehavior: 'emit runtime-unavailable span', memoryBehavior: 'persist degraded_runtime marker', proofpackBehavior: 'include runtime_unavailable flag', recovery: 'fallback to local or queue retry', coverageMarker: 'nautilus.failure.runtime_unavailable' },
  retrieval_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'retrieval.unavailable', traceBehavior: 'emit retrieval-degraded span', memoryBehavior: 'write retrieval gap provenance', proofpackBehavior: 'mark retrievalEvidence=degraded', recovery: 'use degraded retrieval mode with explicit annotation', coverageMarker: 'nautilus.failure.retrieval_unavailable' },
  policy_engine_unavailable: { visibleState: 'failed', failBehavior: 'closed', event: 'policy.unavailable', traceBehavior: 'emit fail-closed policy span', memoryBehavior: 'do not persist execution payloads', proofpackBehavior: 'emit deny proofpack shell only', recovery: 'restore policy engine before retry', coverageMarker: 'nautilus.failure.policy_engine_unavailable' },
  memory_store_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'memory.unavailable', traceBehavior: 'emit memory-write-missed span', memoryBehavior: 'lineage gap: store ephemeral pointer only', proofpackBehavior: 'mark lineageGap=true', recovery: 'continue execution; defer memory write', coverageMarker: 'nautilus.failure.memory_store_unavailable' },
  trace_store_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'trace.unavailable', traceBehavior: 'stdout trace fallback only', memoryBehavior: 'persist trace_unavailable annotation', proofpackBehavior: 'mark traceCompleteness=partial', recovery: 'continue execution; mark proofpack incomplete', coverageMarker: 'nautilus.failure.trace_store_unavailable' },
  proofpack_generation_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'proofpack.unavailable', traceBehavior: 'emit proofpack-unavailable span', memoryBehavior: 'persist proofpack regeneration work item', proofpackBehavior: 'emit explicit unavailable object', recovery: 'regenerate proofpack from immutable events', coverageMarker: 'nautilus.failure.proofpack_generation_unavailable' },
  gpu_telemetry_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'telemetry.gpu.unavailable', traceBehavior: 'emit telemetry-unavailable span', memoryBehavior: 'record missing telemetry sample', proofpackBehavior: 'mark telemetryStatus=unavailable', recovery: 'fallback to runtime health probes', coverageMarker: 'nautilus.failure.gpu_telemetry_unavailable' },
  gpu_telemetry_stale: { visibleState: 'degraded', failBehavior: 'open', event: 'telemetry.gpu.stale', traceBehavior: 'emit stale-telemetry span', memoryBehavior: 'record stale sample timestamp', proofpackBehavior: 'mark telemetryStatus=stale', recovery: 'invalidate stale metrics and refresh sample', coverageMarker: 'nautilus.failure.gpu_telemetry_stale' },
  local_model_unavailable: { visibleState: 'degraded', failBehavior: 'open', event: 'model.local.unavailable', traceBehavior: 'emit local-model-unavailable span', memoryBehavior: 'record fallback-provider lineage', proofpackBehavior: 'mark localModelPath=unavailable', recovery: 'queue or fail over to configured alternative', coverageMarker: 'nautilus.failure.local_model_unavailable' },
  distributed_node_offline: { visibleState: 'degraded', failBehavior: 'open', event: 'mesh.node.offline', traceBehavior: 'emit node-offline span', memoryBehavior: 'record placement exclusion', proofpackBehavior: 'mark nodeParticipation=partial', recovery: 'exclude node from placement and retry', coverageMarker: 'nautilus.failure.distributed_node_offline' },
  event_validation_failure: { visibleState: 'failed', failBehavior: 'closed', event: 'event.validation.failed', traceBehavior: 'emit contract-rejection span', memoryBehavior: 'do not persist invalid payload', proofpackBehavior: 'include rejection reason only', recovery: 'reject mutation and fix producer contract', coverageMarker: 'nautilus.failure.event_validation_failure' },
  storage_limit_reached: { visibleState: 'degraded', failBehavior: 'open', event: 'storage.limit.reached', traceBehavior: 'emit storage-pressure span', memoryBehavior: 'trim prunable data and retain provenance', proofpackBehavior: 'mark storagePressure=true', recovery: 'prune prunable records and retry write', coverageMarker: 'nautilus.failure.storage_limit_reached' },
  timeout: { visibleState: 'failed', failBehavior: 'open', event: 'execution.timeout', traceBehavior: 'emit timeout span', memoryBehavior: 'persist timeout marker for replay', proofpackBehavior: 'mark terminalReason=timeout', recovery: 'cancel timed-out execution and allow replay', coverageMarker: 'nautilus.failure.timeout' },
  cancellation: { visibleState: 'cancelled', failBehavior: 'open', event: 'execution.cancelled', traceBehavior: 'emit cancellation span', memoryBehavior: 'persist cancellation provenance', proofpackBehavior: 'mark terminalReason=cancelled', recovery: 'submit new execution with new idempotency key', coverageMarker: 'nautilus.failure.cancellation' },
  partial_execution_failure: { visibleState: 'degraded', failBehavior: 'open', event: 'execution.partial_failure', traceBehavior: 'emit partial-failure span', memoryBehavior: 'persist partial completion ledger', proofpackBehavior: 'mark artifactCompleteness=partial', recovery: 'complete available steps and emit missing artifacts', coverageMarker: 'nautilus.failure.partial_execution_failure' },
};
