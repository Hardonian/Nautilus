// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash, randomUUID } from 'node:crypto';
import { SCHEMA_VERSION, validateContract } from '../../contracts/nautilus/index.ts';
import { failureSemantics } from '../../src/lib/nautilus/failure-semantics';
import { transitionExecutionState, type StateTransitionEvent } from '../../src/lib/nautilus/state-machine';

type Fixture = { owner: string; namespace: string; retrievalAvailable: boolean; runtimeAvailable: boolean; policyAvailable: boolean; correlationId?: string };

function parseFixture(): Fixture {
  const input = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  return {
    owner: input.owner ?? 'local-operator',
    namespace: input.namespace ?? 'nautilus/mvp',
    retrievalAvailable: input.retrievalAvailable ?? true,
    runtimeAvailable: input.runtimeAvailable ?? true,
    policyAvailable: input.policyAvailable ?? true,
    correlationId: input.correlationId,
  };
}

function runLifecycle(executionId: string, fixture: Fixture): StateTransitionEvent[] {
  const transitions: Array<[from: any, to: any, reason: string]> = [
    ['queued', 'planning', 'execution accepted'],
    ['planning', 'policy_evaluation', 'plan ready'],
  ];
  if (!fixture.policyAvailable) {
    transitions.push(['policy_evaluation', 'failed', failureSemantics.policy_engine_unavailable.event]);
  } else if (!fixture.retrievalAvailable) {
    transitions.push(['policy_evaluation', 'degraded', failureSemantics.retrieval_unavailable.event]);
    transitions.push(['degraded', fixture.runtimeAvailable ? 'executing' : 'failed', fixture.runtimeAvailable ? 'degraded retrieval acknowledged' : failureSemantics.runtime_unavailable.event]);
  } else {
    transitions.push(['policy_evaluation', 'retrieval', 'policy allow']);
    transitions.push(['retrieval', fixture.runtimeAvailable ? 'executing' : 'fallback', fixture.runtimeAvailable ? 'retrieval resolved' : failureSemantics.runtime_unavailable.event]);
    if (!fixture.runtimeAvailable) transitions.push(['fallback', 'failed', 'runtime unavailable with no fallback runtime']);
  }
  if (transitions.at(-1)?.[1] === 'executing') transitions.push(['executing', 'completed', 'runtime completed']);
  return transitions.map(([from, to, reason]) => transitionExecutionState(from, to, { executionId, reason, correlationId: fixture.correlationId }));
}

try {
  const fixture = parseFixture();
  const executionId = randomUUID();
  const idempotencyKey = createHash('sha256').update(`golden:${fixture.owner}:${executionId}`).digest('hex').slice(0, 16);
  const execution = { kind: 'execution', schemaVersion: SCHEMA_VERSION, state: 'queued', idempotencyKey, identityScope: { actorIdentity: fixture.owner, runtimeIdentity: 'runtime/local', nodeIdentity: 'node/local', executionOwner: fixture.owner, namespace: fixture.namespace, policyScope: 'local-default', memoryScope: 'local-default', proofpackScope: 'local-default' } };
  const validation = validateContract('execution', execution);
  if (!validation.ok) throw new Error(validation.errors.join('; '));

  const events = runLifecycle(executionId, fixture);
  const finalState = events.at(-1)?.to ?? 'failed';
  const result = {
    schemaVersion: SCHEMA_VERSION,
    executionId,
    idempotencyKey,
    finalState,
    degraded: finalState !== 'completed',
    evidence: {
      events,
      trace: { traceId: `trace-${executionId}`, spanCount: events.length },
      memory: { provenanceExecutionId: executionId, lineageGap: !fixture.retrievalAvailable, records: [{ kind: 'memory', memoryScope: execution.identityScope.memoryScope }] },
      proofpack: { status: fixture.policyAvailable ? (finalState === 'completed' ? 'complete' : 'partial') : 'deny-shell', evidenceCount: events.length },
    },
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: (error as Error).message })}\n`);
  process.exit(1);
}
