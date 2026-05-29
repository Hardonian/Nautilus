🎯 **What:** This PR addresses a testing gap by adding comprehensive unit tests for the `stripAnsi` utility function located in `src/lib/adapters/openshell/client.ts`. Previously, there was only a single test that did not cover all expected scenarios.

📊 **Coverage:** The new tests cover:
- Stripping basic ANSI color codes.
- Stripping multiple ANSI sequences within the same string.
- Handling strings without any ANSI sequences (no-op).
- Handling edge cases such as empty strings, `undefined`, and calls with no arguments.

✨ **Result:** Test coverage for `stripAnsi` is significantly improved. The expanded suite of tests acts as a robust safety net to ensure no regressions are introduced in this string manipulation utility in the future.

Signed-off-by: Jules <jules@example.com>
