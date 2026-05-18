// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NautilusEventEnvelope } from "./nautilus-event-fabric";
import type { RecallForgeWriter, RecallForgeRecord } from "./recallforge";
import type { OperatorGraphTraceWriter } from "./operatorgraph";
import { eventToOperatorGraphSpan } from "./operatorgraph";

export function consumeRecallForgeEvent(writer: RecallForgeWriter, event: NautilusEventEnvelope): void {
  if (!(event.type.startsWith("memory.") || event.type.startsWith("execution."))) return;
  const record: RecallForgeRecord = {
    id: `${event.type}:${event.timestamp}`,
    category: event.type.startsWith("memory.") ? "execution_lineage" : "routing_outcome",
    createdAt: event.timestamp,
    provenanceEvent: {
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      executionId: event.executionId,
      correlationId: event.correlationId,
    },
    data: event.payload,
  };
  writer.write(record);
}

export function consumeOperatorGraphEvent(writer: OperatorGraphTraceWriter, event: NautilusEventEnvelope): void {
  if (!(event.type.startsWith("trace.") || event.type.startsWith("execution."))) return;
  writer.append(eventToOperatorGraphSpan(event, event.correlationId ?? "unknown-trace", `${event.type}:${event.timestamp}`));
}
