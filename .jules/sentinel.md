## 2025-02-27 - Command Injection in docker pull

**Vulnerability:** In `src/lib/inference/vllm.ts`, the `pullImage` function was susceptible to command injection because the `profile.image` value was directly interpolated into a shell string executed via `runShell`. An attacker who could control `profile.image` could inject arbitrary shell commands.

**Learning:** When invoking external commands like `docker`, one should prefer spawning the command directly with its arguments in an array instead of concatenating them into a shell string.

**Prevention:** Use `run` instead of `runShell` where possible, taking advantage of the argv array parameter. Avoid passing un-sanitized user input into strings executed via the shell.
## 2026-05-29 - [Insecure Randomness in Policy Engine]
 **Vulnerability:** `Math.random()` was used to generate `traceId` and `mutationId` within `policy-engine.ts`.
 **Learning:** Using `Math.random()` to generate IDs leaves them vulnerable to collision or prediction as it is not a cryptographically secure pseudo-random number generator (CSPRNG).
 **Prevention:** Always use `randomUUID()` or `randomBytes()` from the `node:crypto` library when creating identifiers to ensure cryptographic randomness and prevent collisions.
