import { describe, it, expect } from "vitest";
import { validateReplayEnvelope, buildReplayEnvelope } from "../../src/data/control-plane-runtime";
import type { OperationalEvent } from "../../src/data/control-plane-types";

describe("validateReplayEnvelope", () => {
  it("should validate a correctly built envelope", () => {
    const events: OperationalEvent[] = [
      {
        eventId: "event-1",
        occurredAt: "2024-05-22T00:00:00Z",
        sequence: 0,
        category: "telemetry_probe_started",
        source: "test-source",
        provenance: {},
        replayRef: { lineage: ["lineage-1"], replayVersion: "1" },
        payload: {}
      },
      {
        eventId: "event-2",
        occurredAt: "2024-05-22T00:01:00Z",
        sequence: 1,
        category: "telemetry_probe_succeeded",
        source: "test-source",
        provenance: {},
        replayRef: { lineage: ["lineage-1", "lineage-2"], replayVersion: "1" },
        payload: {}
      }
    ];

    const envelope = buildReplayEnvelope(events, "2024-05-22T00:02:00Z");
    const result = validateReplayEnvelope(envelope);

    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("should detect event count mismatch", () => {
    const events: OperationalEvent[] = [
      {
        eventId: "event-1",
        occurredAt: "2024-05-22T00:00:00Z",
        sequence: 0,
        category: "telemetry_probe_started",
        source: "test-source",
        provenance: {},
        replayRef: { lineage: ["lineage-1"], replayVersion: "1" },
        payload: {}
      }
    ];

    const envelope = buildReplayEnvelope(events, "2024-05-22T00:02:00Z");
    // Tamper with the envelope
    envelope.eventCount = 2;

    const result = validateReplayEnvelope(envelope);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("event_count_mismatch");
  });

  it("should detect sequence mismatch", () => {
    const events: OperationalEvent[] = [
      {
        eventId: "event-1",
        occurredAt: "2024-05-22T00:00:00Z",
        sequence: 1, // Should be 0
        category: "telemetry_probe_started",
        source: "test-source",
        provenance: {},
        replayRef: { lineage: ["lineage-1"], replayVersion: "1" },
        payload: {}
      }
    ];

    const envelope = buildReplayEnvelope(events, "2024-05-22T00:02:00Z");

    const result = validateReplayEnvelope(envelope);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("sequence_mismatch");
  });

  it("should detect missing replay lineage", () => {
    const events: OperationalEvent[] = [
      {
        eventId: "event-1",
        occurredAt: "2024-05-22T00:00:00Z",
        sequence: 0,
        category: "telemetry_probe_started",
        source: "test-source",
        provenance: {},
        // Missing replayRef completely
        payload: {}
      }
    ];

    const envelope = buildReplayEnvelope(events, "2024-05-22T00:02:00Z");

    const result = validateReplayEnvelope(envelope);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("missing_replay_lineage");
  });

  it("should detect empty replay lineage", () => {
    const events: OperationalEvent[] = [
      {
        eventId: "event-1",
        occurredAt: "2024-05-22T00:00:00Z",
        sequence: 0,
        category: "telemetry_probe_started",
        source: "test-source",
        provenance: {},
        replayRef: { lineage: [], replayVersion: "1" }, // Empty lineage
        payload: {}
      }
    ];

    const envelope = buildReplayEnvelope(events, "2024-05-22T00:02:00Z");

    const result = validateReplayEnvelope(envelope);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("missing_replay_lineage");
  });

  it("should detect digest mismatch", () => {
    const events: OperationalEvent[] = [
      {
        eventId: "event-1",
        occurredAt: "2024-05-22T00:00:00Z",
        sequence: 0,
        category: "telemetry_probe_started",
        source: "test-source",
        provenance: {},
        replayRef: { lineage: ["lineage-1"], replayVersion: "1" },
        payload: {}
      }
    ];

    const envelope = buildReplayEnvelope(events, "2024-05-22T00:02:00Z");
    // Tamper with the digest
    envelope.digest = "invalid-digest";

    const result = validateReplayEnvelope(envelope);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("digest_mismatch");
  });

  it("should return multiple reasons if multiple errors exist", () => {
    const events: OperationalEvent[] = [
      {
        eventId: "event-1",
        occurredAt: "2024-05-22T00:00:00Z",
        sequence: 1, // sequence mismatch
        category: "telemetry_probe_started",
        source: "test-source",
        provenance: {},
        // missing replay lineage
        payload: {}
      }
    ];

    const envelope = buildReplayEnvelope(events, "2024-05-22T00:02:00Z");
    // tamper with event count
    envelope.eventCount = 99;
    // tamper with digest
    envelope.digest = "invalid";

    const result = validateReplayEnvelope(envelope);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("event_count_mismatch");
    expect(result.reasons).toContain("sequence_mismatch");
    expect(result.reasons).toContain("missing_replay_lineage");
    expect(result.reasons).toContain("digest_mismatch");
    expect(result.reasons.length).toBe(4);
  });
});
