// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { RequestEnvelope } from './request.js';
import type { DeviceRegistry, CapabilitySnapshot } from './device-registry.js';
import type { PolicyEngine } from '../threatmesh/policy-engine.js';
import { issueReceipt, ExecutionReceipt } from './receipts.js';

export interface ScheduleDecision {
  receipt: ExecutionReceipt;
  selectedDevice?: CapabilitySnapshot;
}

export class DeterministicScheduler {
  constructor(
    private readonly registry: DeviceRegistry,
    private readonly policyEngine: PolicyEngine,
  ) {}

  public schedule(request: RequestEnvelope): ScheduleDecision {
    const policyResult = this.policyEngine.evaluateRequest(request);
    if (policyResult.decision === 'deny') {
      return {
        receipt: issueReceipt('denied', policyResult.reason, request.traceId),
      };
    }

    const minMem = request.constraints.minMemoryGb ?? 0;
    const reqGpu = request.constraints.requiresGpu ?? false;
    const capableDevices = this.registry.findCapableDevices(minMem, reqGpu);

    if (capableDevices.length === 0) {
      return {
        receipt: issueReceipt('degraded', 'No devices matched constraints', request.traceId),
      };
    }

    // Deterministic tie-breaking: highest memory first, then lex by ID
    capableDevices.sort((a, b) => {
      if (b.availableMemoryGb !== a.availableMemoryGb) {
        return b.availableMemoryGb - a.availableMemoryGb;
      }
      return a.deviceId.localeCompare(b.deviceId);
    });

    const selectedDevice = capableDevices[0];
    return {
      receipt: issueReceipt('granted', `Scheduled on ${selectedDevice.deviceId}`, request.traceId),
      selectedDevice,
    };
  }
}
