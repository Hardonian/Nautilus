// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type StorageDisposition = 'retain_hot' | 'move_warm' | 'archive_cold' | 'retain_immutable';

export interface RetainedRecord {
  id: string;
  createdAt: string;
  immutableEvidence?: boolean;
}

export function classifyRetention(record: RetainedRecord, nowIso: string, warmAfterMs: number, archiveAfterMs: number): StorageDisposition {
  if (record.immutableEvidence) return 'retain_immutable';
  const ageMs = Date.parse(nowIso) - Date.parse(record.createdAt);
  if (ageMs >= archiveAfterMs) return 'archive_cold';
  if (ageMs >= warmAfterMs) return 'move_warm';
  return 'retain_hot';
}
