// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ExecutionQueueItem, QueueStatus } from './types';
import { QueueReasonCode } from './reason-codes';
import { QueueDecision } from './queue-decision';

export interface QueuePredicate {
  name: string;
  evaluate: (item: ExecutionQueueItem) => QueueDecision;
}

export interface QueueStore {
  get(id: string): ExecutionQueueItem | undefined;
  set(item: ExecutionQueueItem): void;
  delete(id: string): void;
  getAll(): ExecutionQueueItem[];
}

export interface QueueCapacityConfig {
  maxCapacity: number;
  starvationThresholdMs: number;
}

const DEFAULT_CAPACITY: QueueCapacityConfig = {
  maxCapacity: 1000,
  starvationThresholdMs: 30_000,
};

export interface QueuePressureSnapshot {
  depth: number;
  pendingCount: number;
  runningCount: number;
  deadLetterCount: number;
  oldestPendingAgeMs: number;
  starvationDetected: boolean;
  capacityUtilization: number;
  capturedAt: string;
}

export class ExecutionQueue {
  private store: QueueStore;
  private predicates: QueuePredicate[] = [];
  private nextPosition = 1;
  private readonly capacity: QueueCapacityConfig;

  constructor(store: QueueStore, capacity?: Partial<QueueCapacityConfig>) {
    this.store = store;
    this.capacity = { ...DEFAULT_CAPACITY, ...capacity };
  }

  addPredicate(predicate: QueuePredicate): void {
    this.predicates.push(predicate);
  }

  enqueue(item: ExecutionQueueItem): QueueDecision {
    const existing = this.store.get(item.id);
    if (existing) {
      return QueueDecision.block(
        QueueReasonCode.VALIDATION_FAILED,
        `Item ${item.id} is already in the queue with status ${existing.status}`,
      );
    }

    if (item.status !== QueueStatus.PENDING) {
      return QueueDecision.block(
        QueueReasonCode.VALIDATION_FAILED,
        `Item must be PENDING, got ${item.status}`,
      );
    }

    // Bounded capacity — reject deterministically when full
    const activeCount = this.store.getAll().filter(
      (i) => i.status === QueueStatus.PENDING || i.status === QueueStatus.RUNNING,
    ).length;
    if (activeCount >= this.capacity.maxCapacity) {
      return QueueDecision.block(
        QueueReasonCode.QUEUE_FULL,
        `Queue at capacity (${activeCount}/${this.capacity.maxCapacity}), admission denied for ${item.id}`,
      );
    }

    for (const predicate of this.predicates) {
      const decision = predicate.evaluate(item);
      if (!decision.allowed) {
        return decision;
      }
    }

    item.enqueuedAt = new Date().toISOString();
    item.queuePosition = this.nextPosition++;
    this.store.set(item);

    return QueueDecision.allow('Item enqueued successfully');
  }

  dequeue(): ExecutionQueueItem | undefined {
    const now = Date.now();
    const items = this.store
      .getAll()
      .filter((i) => i.status === QueueStatus.PENDING)
      .sort((a, b) => {
        // Starvation prevention: boost priority of items waiting longer than threshold.
        // This ensures no item can wait indefinitely regardless of queue position.
        const ageA = a.enqueuedAt ? now - Date.parse(a.enqueuedAt) : 0;
        const ageB = b.enqueuedAt ? now - Date.parse(b.enqueuedAt) : 0;
        const starvedA = ageA > this.capacity.starvationThresholdMs ? 1 : 0;
        const starvedB = ageB > this.capacity.starvationThresholdMs ? 1 : 0;

        // Starved items always dequeue first; within same starvation class, use position
        if (starvedA !== starvedB) return starvedB - starvedA;
        return (a.queuePosition ?? 0) - (b.queuePosition ?? 0);
      });

    if (items.length === 0) {
      return undefined;
    }

    const item = items[0];
    this.store.delete(item.id);
    return item;
  }

  getItems(): ExecutionQueueItem[] {
    return this.store.getAll();
  }

  getItem(id: string): ExecutionQueueItem | undefined {
    return this.store.get(id);
  }

  updateStatus(
    id: string,
    status: QueueStatus,
    reason?: QueueReasonCode,
  ): QueueDecision {
    const item = this.store.get(id);
    if (!item) {
      return QueueDecision.block(
        QueueReasonCode.INTERNAL_ERROR,
        `Item ${id} not found`,
      );
    }

    const transition = this.validateTransition(item.status, status);
    if (!transition.valid) {
      return QueueDecision.block(
        reason ?? QueueReasonCode.VALIDATION_FAILED,
        transition.reason ?? "",
      );
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();

    if (status === QueueStatus.RUNNING) {
      item.startedAt = new Date().toISOString();
    } else if (
      status === QueueStatus.COMPLETED ||
      status === QueueStatus.FAILED ||
      status === QueueStatus.CANCELLED
    ) {
      item.completedAt = new Date().toISOString();
    }

    if (reason) {
      item.lastReason = reason;
    }

    this.store.set(item);
    return QueueDecision.allow(`Status transitioned to ${status}`);
  }

  getQueueLength(): number {
    return this.store
      .getAll()
      .filter((i) => i.status === QueueStatus.PENDING).length;
  }

  clear(): void {
    for (const item of this.store.getAll()) {
      this.store.delete(item.id);
    }
    this.nextPosition = 1;
  }

  private validateTransition(
    from: QueueStatus,
    to: QueueStatus,
  ): { valid: boolean; reason?: string } {
    const validTransitions: Record<QueueStatus, QueueStatus[]> = {
      [QueueStatus.PENDING]: [QueueStatus.RUNNING, QueueStatus.CANCELLED],
      [QueueStatus.QUEUED]: [
        QueueStatus.PENDING,
        QueueStatus.RUNNING,
        QueueStatus.CANCELLED,
      ],
      [QueueStatus.RUNNING]: [
        QueueStatus.COMPLETED,
        QueueStatus.FAILED,
        QueueStatus.CANCELLED,
      ],
      [QueueStatus.COMPLETED]: [],
      [QueueStatus.FAILED]: [QueueStatus.DEAD_LETTER],
      [QueueStatus.CANCELLED]: [],
      [QueueStatus.BLOCKED]: [QueueStatus.PENDING, QueueStatus.CANCELLED],
      [QueueStatus.DEAD_LETTER]: [],
    };

    const allowed = validTransitions[from] ?? [];
    if (!allowed.includes(to)) {
      return {
        valid: false,
        reason: `Invalid transition from ${from} to ${to}`,
      };
    }

    return { valid: true };
  }

  /**
   * Transition a failed item to dead-letter state.
   * This is an explicit operator-visible action, never automatic.
   */
  moveToDeadLetter(
    id: string,
    reason: QueueReasonCode = QueueReasonCode.DEAD_LETTER_RETRY_EXHAUSTED,
  ): QueueDecision {
    const item = this.store.get(id);
    if (!item) {
      return QueueDecision.block(
        QueueReasonCode.INTERNAL_ERROR,
        `Item ${id} not found`,
      );
    }
    if (item.status !== QueueStatus.FAILED) {
      return QueueDecision.block(
        QueueReasonCode.VALIDATION_FAILED,
        `Only FAILED items can be moved to dead letter, got ${item.status}`,
      );
    }
    item.status = QueueStatus.DEAD_LETTER;
    item.lastReason = reason;
    item.updatedAt = new Date().toISOString();
    this.store.set(item);
    return QueueDecision.allow(`Item ${id} moved to dead letter: ${reason}`);
  }

  /**
   * Snapshot of current queue pressure derived from actual runtime state.
   * No synthetic or estimated values — only observable state.
   */
  captureQueuePressure(): QueuePressureSnapshot {
    const now = Date.now();
    const all = this.store.getAll();
    const pending = all.filter((i) => i.status === QueueStatus.PENDING);
    const running = all.filter((i) => i.status === QueueStatus.RUNNING);
    const deadLetter = all.filter((i) => i.status === QueueStatus.DEAD_LETTER);

    let oldestPendingAgeMs = 0;
    for (const item of pending) {
      if (item.enqueuedAt) {
        const age = now - Date.parse(item.enqueuedAt);
        if (age > oldestPendingAgeMs) oldestPendingAgeMs = age;
      }
    }

    const activeCount = pending.length + running.length;
    return {
      depth: all.length,
      pendingCount: pending.length,
      runningCount: running.length,
      deadLetterCount: deadLetter.length,
      oldestPendingAgeMs,
      starvationDetected: oldestPendingAgeMs > this.capacity.starvationThresholdMs,
      capacityUtilization: this.capacity.maxCapacity > 0
        ? activeCount / this.capacity.maxCapacity
        : 0,
      capturedAt: new Date().toISOString(),
    };
  }
}
