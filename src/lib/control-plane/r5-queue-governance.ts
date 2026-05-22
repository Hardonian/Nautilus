// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type QueueEventType = "admitted" | "retried" | "dead_letter" | "load_shed";

export interface QueueEvent {
  at: string;
  type: QueueEventType;
  queueId: string;
  reason?: string;
}

export interface QueueItem {
  queueId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  status: "queued" | "dead_letter";
  retryCount: number;
}

export class QueueGovernance {
  readonly timeline: QueueEvent[] = [];

  readonly queue = new Map<string, QueueItem>();

  readonly byKey = new Map<string, string>();

  constructor(private readonly config: { maxCapacity: number; maxRetries: number; now?: () => string }) {}

  enqueue(item: Omit<QueueItem, "status" | "retryCount">):
    | { outcome: "admitted"; item: QueueItem }
    | { outcome: "existing"; item: QueueItem }
    | { outcome: "load_shed"; degraded: { state: "degraded"; reason: "queue_over_capacity"; backpressureReason: string; queueId: string } } {
    const existingId = this.byKey.get(item.idempotencyKey);
    if (existingId) return { outcome: "existing", item: this.queue.get(existingId)! };
    if (this.queue.size >= this.config.maxCapacity) {
      this.timeline.push({ at: this.now(), type: "load_shed", queueId: item.queueId, reason: "queue_over_capacity" });
      return { outcome: "load_shed", degraded: { state: "degraded", reason: "queue_over_capacity", backpressureReason: "max_capacity_reached", queueId: item.queueId } };
    }
    const next: QueueItem = { ...item, status: "queued", retryCount: 0 };
    this.queue.set(item.queueId, next);
    this.byKey.set(item.idempotencyKey, item.queueId);
    this.timeline.push({ at: this.now(), type: "admitted", queueId: item.queueId });
    return { outcome: "admitted", item: next };
  }

  markRetry(queueId: string): QueueItem {
    const item = this.queue.get(queueId);
    if (!item) throw new Error("queue_item_not_found");
    item.retryCount += 1;
    if (item.retryCount > this.config.maxRetries) {
      item.status = "dead_letter";
      this.timeline.push({ at: this.now(), type: "dead_letter", queueId, reason: "retry_exhausted" });
      return item;
    }
    this.timeline.push({ at: this.now(), type: "retried", queueId, reason: "retry_scheduled" });
    return item;
  }

  private now(): string {
    return this.config.now ? this.config.now() : new Date().toISOString();
  }
}
