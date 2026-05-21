# Inference Acceleration (Capability-Gated)

This repository now exposes capability-gated inference metadata through `capabilityFromEnv(...)`.

Implemented now:
- Backend capability envelope for `vllm`, `sglang`, `llama_cpp`, `ollama`, `openai`, and `unavailable`.
- Conservative defaults for unsupported acceleration paths.
- Explicit `degradedReason` when backend is unconfigured/unavailable.

Capability-gated only (not faked):
- TurboQuant/KIVI and KV-cache compression are represented as support flags and remain disabled unless a backend confirms support.
- Speculative decoding is only treated as available for backends configured to advertise it.
