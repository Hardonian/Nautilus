// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../runner";
import type { ExecutionId, RuntimeExecutor } from "../core/nautilus-truth-loop";

export class WasmExecutor implements RuntimeExecutor {
  private readonly wasmDir = path.join(ROOT, ".nemoclaw", "wasm-binaries");

  constructor() {
    if (!fs.existsSync(this.wasmDir)) {
      fs.mkdirSync(this.wasmDir, { recursive: true });
    }
  }

  async run(input: { executionId: ExecutionId; correlationId: string; action: string; payload?: Record<string, unknown> }): Promise<Record<string, unknown>> {
    // We expect the action to match a `.wasm` file
    // e.g. "math_add" -> ".nemoclaw/wasm-binaries/math_add.wasm"
    const safeActionName = input.action.replace(/[^a-zA-Z0-9_-]/g, "");
    const wasmPath = path.join(this.wasmDir, `${safeActionName}.wasm`);

    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM binary not found for action: ${safeActionName}`);
    }

    const wasmBuffer = await fs.promises.readFile(wasmPath);
    
    // Instantiate WASM module completely isolated from OS imports
    const wasmModule = await (globalThis as any).WebAssembly.instantiate(wasmBuffer, {
      env: {
        // Expose no OS-level imports to ensure 100% micro-sandboxing
        abort: () => { throw new Error("WASM aborted"); }
      }
    });

    const exports = wasmModule.instance.exports;
    
    // Execute a standard entrypoint
    if (typeof exports.execute === "function") {
      // Very simplified: assuming the function returns an integer result for now
      // A full implementation would use linear memory to pass strings/JSON
      const result = (exports.execute as CallableFunction)();
      return { status: "success", result };
    }

    throw new Error(`WASM binary missing "execute" export`);
  }
}
