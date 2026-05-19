// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface CapabilitySnapshot {
  deviceId: string;
  deviceType: 'cpu' | 'gpu' | 'npu' | 'remote';
  availableMemoryGb: number;
  utilizationPercent: number;
  tags: string[];
  lastUpdatedUtc: string;
}

export class DeviceRegistry {
  private readonly capabilities = new Map<string, CapabilitySnapshot>();

  public registerDevice(snapshot: CapabilitySnapshot): void {
    if (!snapshot.deviceId) {
      throw new Error('deviceId is required for registration');
    }
    this.capabilities.set(snapshot.deviceId, { ...snapshot, lastUpdatedUtc: new Date().toISOString() });
  }

  public getDevice(deviceId: string): CapabilitySnapshot | undefined {
    return this.capabilities.get(deviceId);
  }

  public getAllDevices(): CapabilitySnapshot[] {
    return Array.from(this.capabilities.values());
  }

  public findCapableDevices(minMemoryGb: number, requiresGpu: boolean): CapabilitySnapshot[] {
    return Array.from(this.capabilities.values()).filter((device) => {
      if (requiresGpu && device.deviceType !== 'gpu') return false;
      if (device.availableMemoryGb < minMemoryGb) return false;
      return true;
    });
  }
}
