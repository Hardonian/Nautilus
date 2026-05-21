# Orchestration (Capability-Aware, Compact Handoffs)

Nautilus uses compact handoff packets for internal orchestration (`src/lib/control-plane/orchestration.ts`).

Implemented now:
- Schema-validated `AgentHandoffState` with explicit phase, privacy, token budget, and degraded reason fields.
- Deterministic handoff compaction with evidence reference preservation.
- Explicit local-only fail-closed routing behavior.

Truth statement:
Nautilus implements capability-aware orchestration hooks and compact recursive handoffs. It does not claim true hidden-state RecursiveMAS transfer, TurboQuant, KIVI, speculative decoding, or backend-native acceleration unless the selected serving backend exposes and confirms those capabilities.
