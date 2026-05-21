# Proofpack and Telemetry Notes

This change adds deterministic, testable orchestration contracts and degraded-state route decisions; see tests in `src/lib/control-plane/orchestration.test.ts`.

Current state:
- Orchestration route decisions are explainable (reason + rejected reasons + degraded reason).
- Handoff compaction reports size reduction metrics.

Follow-up work can wire these fields into full proofpack generation pipelines.
