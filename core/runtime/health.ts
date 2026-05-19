// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type RuntimeAvailability = 'available' | 'degraded' | 'unavailable';

export interface RuntimeProbe {
  adapter: string;
  reachable: boolean;
  degraded?: boolean;
  reason?: string;
}

export function classifyRuntimeAvailability(probes: RuntimeProbe[]): { status: RuntimeAvailability; reasons: string[] } {
  if (probes.length === 0) return { status: 'unavailable', reasons: ['no_runtime_probes'] };
  const unavailable = probes.filter((probe) => !probe.reachable);
  const degraded = probes.filter((probe) => probe.reachable && probe.degraded);
  if (unavailable.length === probes.length) return { status: 'unavailable', reasons: unavailable.map((probe) => probe.reason ?? `${probe.adapter}_unreachable`) };
  if (unavailable.length > 0 || degraded.length > 0) return { status: 'degraded', reasons: [...unavailable, ...degraded].map((probe) => probe.reason ?? `${probe.adapter}_degraded`) };
  return { status: 'available', reasons: [] };
}
