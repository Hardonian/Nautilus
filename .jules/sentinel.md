## 2026-05-29 - [HIGH] Fix command injection finding in debug diagnostics
 **Vulnerability:** SAST scanner finding for potential command injection in `execFileSync` within `src/lib/diagnostics/debug.ts`.
 **Learning:** The original code used a template string literal (\`command -v "$1"\`) which triggered a false positive from a static analysis tool, assuming dynamic interpolation, even though the variable was safely passed as a positional argument (\`$1\`).
 **Prevention:** Use standard string literals (single or double quotes) instead of template literals (backticks) when passing static string structures to shell execution functions, to avoid confusing SAST scanners.
