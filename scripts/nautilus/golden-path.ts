// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { randomUUID, createHash } from 'node:crypto';
import { transitionExecutionState } from '../../src/lib/nautilus/state-machine';
import { validateContract } from '../../contracts/nautilus/index';

const owner = 'local-operator';
const executionId = randomUUID();
const idempotencyKey = createHash('sha256').update(`golden:${owner}:${executionId}`).digest('hex').slice(0, 16);

const execution = {
  kind: 'execution',
  schemaVersion: '1.0.0',
  state: 'queued',
  idempotencyKey,
  identityScope: {
    actorIdentity: owner,
    runtimeIdentity: 'runtime/local',
    nodeIdentity: 'node/local',
    executionOwner: owner,
    namespace: 'nautilus/mvp',
    policyScope: 'local-default',
    memoryScope: 'local-default',
    proofpackScope: 'local-default',
  },
};
const result = validateContract('execution', execution);
if (!result.ok) throw new Error(`invalid execution contract: ${result.errors.join(', ')}`);

const events = [
  transitionExecutionState('queued', 'planning'),
  transitionExecutionState('planning', 'policy_evaluation'),
  transitionExecutionState('policy_evaluation', 'retrieval'),
  transitionExecutionState('retrieval', 'executing'),
  transitionExecutionState('executing', 'completed'),
];

console.log(JSON.stringify({ executionId, idempotencyKey, finalState: 'completed', events }, null, 2));
