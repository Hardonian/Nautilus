// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type NautilusEventFamily =
  | "execution"
  | "runtime"
  | "gpu"
  | "retrieval"
  | "policy"
  | "memory"
  | "trace"
  | "fallback"
  | "agent";

export type NautilusEventType =
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "runtime.degraded"
  | "runtime.restored"
  | "gpu.overloaded"
  | "gpu.thermal_alert"
  | "retrieval.started"
  | "retrieval.completed"
  | "policy.evaluated"
  | "policy.denied"
  | "memory.recorded"
  | "trace.recorded"
  | "fallback.triggered"
  | "agent.escalated";

export type NautilusSeverity = "debug" | "info" | "warn" | "error" | "critical";
export type NautilusStatus = "started" | "completed" | "failed" | "degraded" | "restored" | "denied";

export interface NautilusEventEnvelope<TPayload = Record<string, unknown>> {
  version: "1.0.0";
  type: NautilusEventType;
  family: NautilusEventFamily;
  timestamp: string;
  source: string;
  executionId?: string;
  correlationId?: string;
  severity?: NautilusSeverity;
  status?: NautilusStatus;
  payload: TPayload;
}

const TYPE_FAMILY_MAP: Record<NautilusEventType, NautilusEventFamily> = {
  "execution.started": "execution",
  "execution.completed": "execution",
  "execution.failed": "execution",
  "runtime.degraded": "runtime",
  "runtime.restored": "runtime",
  "gpu.overloaded": "gpu",
  "gpu.thermal_alert": "gpu",
  "retrieval.started": "retrieval",
  "retrieval.completed": "retrieval",
  "policy.evaluated": "policy",
  "policy.denied": "policy",
  "memory.recorded": "memory",
  "trace.recorded": "trace",
  "fallback.triggered": "fallback",
  "agent.escalated": "agent",
};

export function buildNautilusEvent<TPayload>(event: Omit<NautilusEventEnvelope<TPayload>, "version" | "family" | "timestamp"> & { timestamp?: string }): NautilusEventEnvelope<TPayload> {
  return {
    ...event,
    version: "1.0.0",
    family: TYPE_FAMILY_MAP[event.type],
    timestamp: event.timestamp ?? new Date().toISOString(),
  };
}

export function validateNautilusEvent(event: NautilusEventEnvelope): void {
  if (event.version !== "1.0.0") throw new Error(`Unsupported event version: ${event.version}`);
  if (TYPE_FAMILY_MAP[event.type] !== event.family) throw new Error(`Event family mismatch for type ${event.type}`);
  if (!event.source) throw new Error("Event source is required");
  if (!event.timestamp || Number.isNaN(Date.parse(event.timestamp))) throw new Error("Event timestamp must be valid ISO-8601");
}

export interface NautilusEventEmitter {
  emit(event: NautilusEventEnvelope): void;
}

export class InMemoryNautilusEventBus implements NautilusEventEmitter {
  private readonly events: NautilusEventEnvelope[] = [];
  emit(event: NautilusEventEnvelope): void {
    validateNautilusEvent(event);
    this.events.push(event);
  }
  list(): readonly NautilusEventEnvelope[] {
    return this.events;
  }
}
