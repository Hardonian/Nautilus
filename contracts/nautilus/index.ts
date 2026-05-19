// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Ajv from 'ajv';

export const SCHEMA_VERSION = '1.0.0' as const;

export const contractKinds = [
  'execution',
  'runtime',
  'retrieval',
  'policy',
  'replay',
  'proofpack',
  'event',
  'memory',
] as const;

export type ContractKind = (typeof contractKinds)[number];

const executionStates = [
  'queued',
  'planning',
  'policy_evaluation',
  'retrieval',
  'executing',
  'fallback',
  'degraded',
  'completed',
  'failed',
  'cancelled',
  'replaying',
] as const;

export type ExecutionState = (typeof executionStates)[number];

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

const utcTimestampPattern = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$';

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
  execution: {
    type: 'object',
    required: ['kind', 'schemaVersion', 'state', 'identityScope', 'idempotencyKey'],
    properties: {
      kind: { const: 'execution' },
      schemaVersion: { const: SCHEMA_VERSION },
      state: { enum: executionStates },
      identityScope: identityScopeSchema,
      idempotencyKey: { type: 'string', minLength: 8 },
    },
    additionalProperties: false,
  },
  runtime: { type: 'object', required: ['kind', 'schemaVersion', 'runtimeStatus'], properties: { kind: { const: 'runtime' }, schemaVersion: { const: SCHEMA_VERSION }, runtimeStatus: { enum: ['available', 'unavailable', 'degraded'] } }, additionalProperties: false },
  retrieval: { type: 'object', required: ['kind', 'schemaVersion', 'mode'], properties: { kind: { const: 'retrieval' }, schemaVersion: { const: SCHEMA_VERSION }, mode: { enum: ['historical', 'refresh', 'degraded'] } }, additionalProperties: false },
  policy: { type: 'object', required: ['kind', 'schemaVersion', 'decision', 'policyScope'], properties: { kind: { const: 'policy' }, schemaVersion: { const: SCHEMA_VERSION }, decision: { enum: ['allow', 'deny'] }, policyScope: { type: 'string', minLength: 1 } }, additionalProperties: false },
  replay: { type: 'object', required: ['kind', 'schemaVersion', 'replayMode'], properties: { kind: { const: 'replay' }, schemaVersion: { const: SCHEMA_VERSION }, replayMode: { enum: ['read_only', 'mutation_safe'] } }, additionalProperties: false },
  proofpack: { type: 'object', required: ['kind', 'schemaVersion', 'proofpackScope'], properties: { kind: { const: 'proofpack' }, schemaVersion: { const: SCHEMA_VERSION }, proofpackScope: { type: 'string', minLength: 1 } }, additionalProperties: false },
  event: { type: 'object', required: ['kind', 'schemaVersion', 'eventType', 'timestampUtc'], properties: { kind: { const: 'event' }, schemaVersion: { const: SCHEMA_VERSION }, eventType: { type: 'string', minLength: 1 }, timestampUtc: { type: 'string', pattern: utcTimestampPattern } }, additionalProperties: false },
  memory: { type: 'object', required: ['kind', 'schemaVersion', 'memoryScope', 'provenanceEventId'], properties: { kind: { const: 'memory' }, schemaVersion: { const: SCHEMA_VERSION }, memoryScope: { type: 'string', minLength: 1 }, provenanceEventId: { type: 'string', minLength: 1 } }, additionalProperties: false },
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
const validators = Object.fromEntries(Object.entries(contractSchemas).map(([k, schema]) => [k, ajv.compile(schema)]));

export interface ContractValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateContract(kind: ContractKind, input: unknown): ContractValidationResult {
  const validator = validators[kind];
  const ok = validator(input) ?? false;
  if (ok) {
    return { ok: true, errors: [] };
  }
  const errors = (validator.errors ?? []).map((e) => {
    const path = e.instancePath || '/';
    return `[${kind}] ${path} ${e.message ?? 'validation error'}`;
  });
  return { ok: false, errors };
}

export function isSchemaVersionCompatible(readerVersion: string, payloadVersion: string): boolean {
  const parse = (version: string): number[] => version.split('.').map((part) => Number.parseInt(part, 10));
  const [rMajor, rMinor] = parse(readerVersion);
  const [pMajor, pMinor] = parse(payloadVersion);
  if (Number.isNaN(rMajor) || Number.isNaN(rMinor) || Number.isNaN(pMajor) || Number.isNaN(pMinor)) {
    return false;
  }
  return rMajor === pMajor && pMinor <= rMinor;
}

export const migrationNotes = {
  from_0_9_to_1_0: 'Adds explicit identity/scope and replay mode requirements; execution records without scoped identity are rejected.',
  from_1_0_to_future: 'Future 1.x migrations are additive-only for readers; writers must emit their exact schemaVersion to keep replay deterministic.',
};

export const compatibilityRules = {
  backwardRead: '1.x readers accept 1.0+ payloads only when fields are additive and major version is unchanged.',
  forwardWrite: 'Writers must emit exact schemaVersion implemented by their contract package.',
  replay: 'Replay consumes immutable events and requires matching major version compatibility.',
};
