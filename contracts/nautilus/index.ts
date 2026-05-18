// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Ajv from 'ajv';

export const SCHEMA_VERSION = '1.0.0' as const;

export type ContractKind =
  | 'execution'
  | 'runtime'
  | 'retrieval'
  | 'policy'
  | 'replay'
  | 'proofpack'
  | 'event'
  | 'memory';

export type ExecutionState =
  | 'queued'
  | 'planning'
  | 'policy_evaluation'
  | 'retrieval'
  | 'executing'
  | 'fallback'
  | 'degraded'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'replaying';

export const legalTransitions: Record<ExecutionState, ExecutionState[]> = {
  queued: ['planning', 'cancelled'],
  planning: ['policy_evaluation', 'failed', 'cancelled'],
  policy_evaluation: ['retrieval', 'failed', 'degraded', 'cancelled'],
  retrieval: ['executing', 'fallback', 'degraded', 'failed', 'cancelled'],
  executing: ['completed', 'failed', 'fallback', 'degraded', 'cancelled'],
  fallback: ['executing', 'degraded', 'failed', 'cancelled'],
  degraded: ['executing', 'completed', 'failed', 'cancelled'],
  replaying: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

export interface IdentityScope {
  actorIdentity: string;
  runtimeIdentity: string;
  nodeIdentity: string;
  executionOwner: string;
  namespace: string;
  policyScope: string;
  memoryScope: string;
  proofpackScope: string;
}

const identityScopeSchema = {
  type: 'object',
  required: [
    'actorIdentity',
    'runtimeIdentity',
    'nodeIdentity',
    'executionOwner',
    'namespace',
    'policyScope',
    'memoryScope',
    'proofpackScope',
  ],
  additionalProperties: false,
  properties: {
    actorIdentity: { type: 'string', minLength: 1 },
    runtimeIdentity: { type: 'string', minLength: 1 },
    nodeIdentity: { type: 'string', minLength: 1 },
    executionOwner: { type: 'string', minLength: 1 },
    namespace: { type: 'string', minLength: 1 },
    policyScope: { type: 'string', minLength: 1 },
    memoryScope: { type: 'string', minLength: 1 },
    proofpackScope: { type: 'string', minLength: 1 },
  },
} as const;

export const contractSchemas = {
  execution: { type: 'object', required: ['kind', 'schemaVersion', 'state', 'identityScope', 'idempotencyKey'], properties: { kind: { const: 'execution' }, schemaVersion: { const: SCHEMA_VERSION }, state: { enum: Object.keys(legalTransitions) }, identityScope: identityScopeSchema, idempotencyKey: { type: 'string', minLength: 8 } }, additionalProperties: false },
  runtime: { type: 'object', required: ['kind', 'schemaVersion', 'runtimeStatus'], properties: { kind: { const: 'runtime' }, schemaVersion: { const: SCHEMA_VERSION }, runtimeStatus: { enum: ['available', 'unavailable', 'degraded'] } }, additionalProperties: false },
  retrieval: { type: 'object', required: ['kind', 'schemaVersion', 'mode'], properties: { kind: { const: 'retrieval' }, schemaVersion: { const: SCHEMA_VERSION }, mode: { enum: ['historical', 'refresh', 'degraded'] } }, additionalProperties: false },
  policy: { type: 'object', required: ['kind', 'schemaVersion', 'decision', 'policyScope'], properties: { kind: { const: 'policy' }, schemaVersion: { const: SCHEMA_VERSION }, decision: { enum: ['allow', 'deny'] }, policyScope: { type: 'string', minLength: 1 } }, additionalProperties: false },
  replay: { type: 'object', required: ['kind', 'schemaVersion', 'replayMode'], properties: { kind: { const: 'replay' }, schemaVersion: { const: SCHEMA_VERSION }, replayMode: { enum: ['read_only', 'mutation_safe'] } }, additionalProperties: false },
  proofpack: { type: 'object', required: ['kind', 'schemaVersion', 'proofpackScope'], properties: { kind: { const: 'proofpack' }, schemaVersion: { const: SCHEMA_VERSION }, proofpackScope: { type: 'string', minLength: 1 } }, additionalProperties: false },
  event: { type: 'object', required: ['kind', 'schemaVersion', 'eventType', 'timestampUtc'], properties: { kind: { const: 'event' }, schemaVersion: { const: SCHEMA_VERSION }, eventType: { type: 'string', minLength: 1 }, timestampUtc: { type: 'string', minLength: 20 } }, additionalProperties: false },
  memory: { type: 'object', required: ['kind', 'schemaVersion', 'memoryScope', 'provenanceEventId'], properties: { kind: { const: 'memory' }, schemaVersion: { const: SCHEMA_VERSION }, memoryScope: { type: 'string', minLength: 1 }, provenanceEventId: { type: 'string', minLength: 1 } }, additionalProperties: false },
} as const;

const ajv = new Ajv();
const validators = Object.fromEntries(
  Object.entries(contractSchemas).map(([key, schema]) => [key, ajv.compile(schema)]),
);

export function validateContract(kind: ContractKind, input: unknown): { ok: boolean; errors: string[] } {
  const validator = validators[kind];
  const ok = validator(input) ?? false;
  return {
    ok,
    errors: ok ? [] : (validator.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`),
  };
}

export const migrationNotes = {
  from_0_9_to_1_0: 'Adds explicit identity/scope and replay mode requirements. Incompatible with unscoped execution records.',
};

export const compatibilityRules = {
  backwardRead: '1.x readers must accept 1.0+ payloads with additive fields only',
  forwardWrite: 'Writers must emit exact schemaVersion they implement',
  replay: 'Replay can only consume immutable events with same major schema version',
};
