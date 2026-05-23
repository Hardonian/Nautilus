// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface PeerNode {
  id: string;
  url: string;
  lastSeen: string;
  status: "healthy" | "unreachable";
  workloadCapacity: number;
}

export interface GridWorkload {
  executionId: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface GridNode {
  registerPeer(peerUrl: string): Promise<void>;
  listPeers(): PeerNode[];
  routeWorkload(workload: GridWorkload): Promise<boolean>;
}

export class LocalGridNode implements GridNode {
  private peers = new Map<string, PeerNode>();

  constructor(private readonly localNodeId: string) {}

  async registerPeer(peerUrl: string): Promise<void> {
    const peerId = `peer_${Buffer.from(peerUrl).toString("base64").substring(0, 8)}`;
    this.peers.set(peerId, {
      id: peerId,
      url: peerUrl,
      lastSeen: new Date().toISOString(),
      status: "healthy",
      workloadCapacity: 10,
    });
  }

  listPeers(): PeerNode[] {
    return Array.from(this.peers.values());
  }

  async routeWorkload(workload: GridWorkload): Promise<boolean> {
    const healthyPeers = this.listPeers().filter(p => p.status === "healthy");
    if (healthyPeers.length === 0) return false;

    // Simple round-robin for grid routing
    const target = healthyPeers[Math.floor(Math.random() * healthyPeers.length)];

    try {
      const res = await fetch(`${target.url}/grid/workload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workload),
      });
      return res.ok;
    } catch {
      target.status = "unreachable";
      return false;
    }
  }
}
