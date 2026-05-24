#!/bin/bash
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

./submit.sh "test/getSessionAgent-coverage" "test: add getSessionAgent error path test coverage" "🧪 [testing improvement] Add getSessionAgent error path test coverage" "🎯 **What:** Added a missing test case for the error path in \`getSessionAgent\` when \`registry.getSandbox\` or \`onboardSession.loadSession()\` throws an error.

📊 **Coverage:** The test mocks the registry to force an error, validating that the catch block properly handles it by returning \`null\` instead of crashing. This covers line 23-38.

✨ **Result:** Improved test reliability and coverage, ensuring that exceptions accessing the sandbox registry gracefully fallback to default behavior."
