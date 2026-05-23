// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { NautilusEventEmitter, NautilusEventEnvelope } from "./nautilus-event-fabric";

export interface EventFabricSubscriber {
  onEvent(event: NautilusEventEnvelope): void | Promise<void>;
}

export interface EventFabricNode extends NautilusEventEmitter {
  subscribe(family: string, subscriber: EventFabricSubscriber): void;
  unsubscribe(family: string, subscriber: EventFabricSubscriber): void;
}

export class LocalEventFabricNode implements EventFabricNode {
  private subscribers = new Map<string, Set<EventFabricSubscriber>>();

  emit(event: NautilusEventEnvelope): void {
    const familySubscribers = this.subscribers.get(event.family);
    if (familySubscribers) {
      for (const subscriber of familySubscribers) {
        // Fire and forget so slow subscribers do not block the thread
        void subscriber.onEvent(event);
      }
    }
    
    // Also notify wildcard subscribers if any
    const wildcardSubscribers = this.subscribers.get("*");
    if (wildcardSubscribers) {
      for (const subscriber of wildcardSubscribers) {
        void subscriber.onEvent(event);
      }
    }
  }

  subscribe(family: string, subscriber: EventFabricSubscriber): void {
    let familySubscribers = this.subscribers.get(family);
    if (!familySubscribers) {
      familySubscribers = new Set();
      this.subscribers.set(family, familySubscribers);
    }
    familySubscribers.add(subscriber);
  }

  unsubscribe(family: string, subscriber: EventFabricSubscriber): void {
    const familySubscribers = this.subscribers.get(family);
    if (familySubscribers) {
      familySubscribers.delete(subscriber);
    }
  }
}

// Re-export the primitives for convenience
export * from "./nautilus-event-fabric";
