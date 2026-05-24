// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { applyExecutionTransition, validateExecutionTransition } from "./execution-state-machine";

describe("execution state machine", () => {
  it("rejects invalid transitions", () => {
    const r = applyExecutionTransition("completed", { to: "executing", atIso: "2026-01-01T00:00:00.000Z", lineageId: "x", reasonCode: "execution_started" });
    expect(r.ok).toBe(false);
  });

  describe("validateExecutionTransition", () => {
    it("allows a valid transition with a reason code", () => {
      const r = validateExecutionTransition({ from: "observed", to: "planned", atIso: "2026-01-01T00:00:00.000Z", lineageId: "x", reasonCode: "plan_approved" });
      expect(r.ok).toBe(true);
      expect(r.state).toBe("planned");
      expect(r.error).toBeUndefined();
    });

    it("rejects a transition missing a reason code", () => {
      const r = validateExecutionTransition({ from: "observed", to: "planned", atIso: "2026-01-01T00:00:00.000Z", lineageId: "x" });
      expect(r.ok).toBe(false);
      expect(r.error).toBe("missing_reason_code");
      expect(r.state).toBe("observed");
    });

    it("rejects an illegal transition", () => {
      const r = validateExecutionTransition({ from: "completed", to: "executing", atIso: "2026-01-01T00:00:00.000Z", lineageId: "x", reasonCode: "execution_started" });
      expect(r.ok).toBe(false);
      expect(r.error).toBe("illegal_transition");
      expect(r.state).toBe("completed");
    });
  });
});
