# Model Routing

`routeModel(...)` in `src/lib/control-plane/orchestration.ts` implements deterministic route decisions.

Policy:
1. Fail closed when privacy is `local_only` and only external backend is available.
2. Reject long-context path when retrieval is sufficient.
3. Return explicit degraded decisions when structured output is required but unsupported.
4. Prefer the lowest safe cost model class (`small`, `code_reasoning`, `long_context`) based on handoff state.
