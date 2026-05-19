// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export const CANONICAL_EVENT_TYPES = [
  'execution.started',
  'execution.completed',
  'execution.failed',
  'fallback.triggered',
  'policy.denied',
  'retrieval.completed',
  'gpu.overloaded',
  'gpu.thermal_alert',
  'memory.recorded',
  'trace.recorded',
  'agent.escalated',
  'runtime.degraded',
  'runtime.restored',
] as const;

export type CanonicalEventType = (typeof CANONICAL_EVENT_TYPES)[number];

export type NautilusEvent = {
  type: CanonicalEventType;
  at: string;
  runId: string;
  pillar: 'runtime' | 'recallforge' | 'operatorgraph' | 'threatmesh' | 'meshrag';
  severity: 'info' | 'warning' | 'error';
  correlationId?: string;
  state?: 'started' | 'completed' | 'failed' | 'degraded' | 'restored' | 'denied';
  payload: Record<string, unknown>;
};

export function isCanonicalEventType(value: string): value is CanonicalEventType {
  return CANONICAL_EVENT_TYPES.includes(value as CanonicalEventType);
}

export function validateNautilusEvent(candidate: unknown): candidate is NautilusEvent {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const event = candidate as Partial<NautilusEvent>;
  return (
    typeof event.type === 'string' &&
    isCanonicalEventType(event.type) &&
    typeof event.at === 'string' &&
    typeof event.runId === 'string' &&
    typeof event.pillar === 'string' &&
    ['runtime', 'recallforge', 'operatorgraph', 'threatmesh', 'meshrag'].includes(event.pillar) &&
    typeof event.severity === 'string' &&
    ['info', 'warning', 'error'].includes(event.severity) &&
    (event.correlationId === undefined || typeof event.correlationId === 'string') &&
    (event.state === undefined || ['started', 'completed', 'failed', 'degraded', 'restored', 'denied'].includes(event.state)) &&
    !!event.payload &&
    typeof event.payload === 'object'
  );
}
