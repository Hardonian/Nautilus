## 2025-02-27 - Command Injection in docker pull

**Vulnerability:** In `src/lib/inference/vllm.ts`, the `pullImage` function was susceptible to command injection because the `profile.image` value was directly interpolated into a shell string executed via `runShell`. An attacker who could control `profile.image` could inject arbitrary shell commands.

**Learning:** When invoking external commands like `docker`, one should prefer spawning the command directly with its arguments in an array instead of concatenating them into a shell string.

**Prevention:** Use `run` instead of `runShell` where possible, taking advantage of the argv array parameter. Avoid passing un-sanitized user input into strings executed via the shell.

## 2026-05-29 - Prevent Option Injection / Arbitrary Command Execution in swapfile creation
**Vulnerability:** The \`sudo\` system commands in \`src/lib/onboard/preflight.ts\` for creating the swapfile were missing end-of-options delimiters (\`--\`) and strict path validation. Although currently hardcoded, if parameterized, a user-supplied swapfile path could be used to inject arbitrary command-line options or traverse directories leading to privilege escalation as the root user.
**Learning:** System commands executing via \`sudo\` inside the application, especially file manipulation tools, are often susceptible to argument injection if user input begins with a hyphen.
**Prevention:** Always use the end-of-options delimiter (\`--\`) before path arguments in commands like \`chmod\`, \`rm\`, \`mkswap\`, \`swapon\`. Strictly validate paths to be absolute and safe against traversal (\`..\`), and sanitize the permitted character sets.
