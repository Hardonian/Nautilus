// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildProofpack, buildReplayReport, buildRuntimeHealthDegraded, buildScenarioOutput, scenarioDefinitions } from '../../scripts/nautilus/fixtures';

describe('Nautilus MVP package smoke fixtures', () => {
  it('keeps the ten packaged examples deterministic and in sync', () => {
    expect(scenarioDefinitions).toHaveLength(10);
    for (const scenario of scenarioDefinitions) {
      const expected = JSON.parse(readFileSync(`examples/nautilus/${scenario.name}/expected-output.json`, 'utf8'));
      expect(expected).toEqual(buildScenarioOutput(scenario));
      expect(expected.deterministicSample).toBe(true);
      expect(expected.notice).toContain('not live telemetry');
    }
  });

  it('marks proofpack, replay, and runtime-health outputs as deterministic samples', () => {
    expect(buildProofpack('complete')).toMatchObject({ deterministicSample: true, status: 'complete' });
    expect(buildProofpack('partial')).toMatchObject({ deterministicSample: true, status: 'partial', completeness: 'partial' });
    expect(buildReplayReport()).toMatchObject({ deterministicSample: true, replayMode: 'read_only', mutationSafe: true });
    expect(buildRuntimeHealthDegraded()).toMatchObject({ deterministicSample: true, degraded: true, runtimeStatus: 'unavailable' });
  });
});
