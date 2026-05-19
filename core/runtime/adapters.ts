// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { RequestEnvelope } from './request.js';
import type { ExecutionReceipt } from './receipts.js';

export interface OrchestratorAdapter {
  id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  dispatch(request: RequestEnvelope): Promise<ExecutionReceipt>;
}

export class DynamoAdapterSeam implements OrchestratorAdapter {
  public readonly id = 'dynamo-adapter-seam';

  public async connect(): Promise<void> {
    // Scaffold
  }

  public async disconnect(): Promise<void> {
    // Scaffold
  }

  public async dispatch(request: RequestEnvelope): Promise<ExecutionReceipt> {
    throw new Error('Not implemented: Dynamo adapter dispatch');
  }
}

export class GpuOrchestratorAdapterSeam implements OrchestratorAdapter {
  public readonly id = 'gpu-orchestrator-seam';

  public async connect(): Promise<void> {
    // Scaffold
  }

  public async disconnect(): Promise<void> {
    // Scaffold
  }

  public async dispatch(request: RequestEnvelope): Promise<ExecutionReceipt> {
    throw new Error('Not implemented: GPU Orchestrator adapter dispatch');
  }
}
