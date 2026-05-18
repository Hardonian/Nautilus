// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Ajv from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  capabilityReportSchema,
  generateCapabilityReport,
  parseNvidiaSmiCsv,
  probeNvidiaSmi,
  type GpuSnapshot,
} from "./local-device-agent";

describe("local-device-agent", () => {
  it("parses nvidia-smi CSV lines", () => {
    const parsed = parseNvidiaSmiCsv("NVIDIA L40, 46068, GPU-123\nNVIDIA T4,15109,GPU-999");
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ name: "NVIDIA L40", memoryTotalMiB: 46068, uuid: "GPU-123" });
  });

  it("handles unavailable nvidia-smi", () => {
    const snapshot = probeNvidiaSmi(() => ({ status: null, error: new Error("ENOENT"), stdout: "", stderr: "" }) as never);
    expect(snapshot.state).toBe("unavailable");
    expect(snapshot.reason).toBe("nvidia-smi_unavailable");
  });

  it("marks snapshot stale when last observation exceeds threshold", async () => {
    const report = await generateCapabilityReport({ nowIso: "2026-05-18T12:00:00.000Z", lastObservedAtIso: "2026-05-18T11:40:00.000Z", staleAfterMs: 60_000 });
    expect(report.deviceSnapshot.stale).toBe(true);
    expect(report.deviceSnapshot.staleReason).toBe("telemetry_stale");
  });

  it("uses manual config fallback for GPU snapshot", async () => {
    const manual: GpuSnapshot = { state: "unknown", source: "config", reason: "manual_fallback", gpus: [] };
    const report = await generateCapabilityReport({ manualGpuSnapshot: manual });
    expect(report.gpuSnapshot.source).toBe("config");
    expect(report.gpuSnapshot.reason).toBe("manual_fallback");
  });

  it("validates report against JSON schema", async () => {
    const report = await generateCapabilityReport();
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(capabilityReportSchema);
    const ok = validate(report);
    expect(ok, JSON.stringify(validate.errors)).toBe(true);
  });
});
