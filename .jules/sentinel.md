## 2025-02-27 - Command Injection in docker pull

**Vulnerability:** In `src/lib/inference/vllm.ts`, the `pullImage` function was susceptible to command injection because the `profile.image` value was directly interpolated into a shell string executed via `runShell`. An attacker who could control `profile.image` could inject arbitrary shell commands.

**Learning:** When invoking external commands like `docker`, one should prefer spawning the command directly with its arguments in an array instead of concatenating them into a shell string.

**Prevention:** Use `run` instead of `runShell` where possible, taking advantage of the argv array parameter. Avoid passing un-sanitized user input into strings executed via the shell.

## 2026-05-29 - Secure creation of Temporary Directories
 **Vulnerability:** Unsafe temporary file creation mapping sensitive SSH configuration in a globally accessible temporary directory.
 **Learning:** Using `fs.mkdtempSync` alongside `os.tmpdir()` creates a temporary directory in a location that is readable by other users on the system, which is unsafe for sensitive info like SSH configuration.
 **Prevention:** Use `process.env.HOME` or `os.homedir()` to place temporary files in an application-specific user-owned folder (e.g., `~/.nemoclaw/tmp`) with restricted permissions (`0o700`).
