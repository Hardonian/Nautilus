## 2024-05-24 - Weak Hashing Algorithm (SHA256 without salt)
 **Vulnerability:** The codebase was obfuscating credentials and tokens using SHA-256 without a salt. These hashes were stored and used for state integrity checks and multi-sandbox conflict detection.
 **Learning:** Pure string equality checks on hashes (`a === b`) for deterministic validation creates an implicit requirement for saltless, fast algorithms which naturally leads to weak hashing implementations.
 **Prevention:** For secure operations, prefer Node.js built-ins (`scryptSync` + `timingSafeEqual`). When deterministic state comparison is necessary, it must not apply to secrets; secrets should always use randomized salts and dedicated verification routines.
