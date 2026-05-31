// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { runOpenshellProviderCommand } from "../../../lib/actions/global";
import { OPENSHELL_OPERATION_TIMEOUT_MS } from "../../../lib/adapters/openshell/timeouts";

/**
 * Resets a provider credential via the OpenShell gateway.
 * Returns an object with { success: boolean, stderr?: string }.
 */
export function resetProviderCredentials(provider: string): { success: boolean; stderr?: string } {
  const result = runOpenshellProviderCommand(["provider", "delete", provider], {
    ignoreError: true,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: OPENSHELL_OPERATION_TIMEOUT_MS,
  });

  if (result.status === 0) {
    return { success: true };
  }
  return { success: false, stderr: result.stderr ? String(result.stderr).trim() : undefined };
}
