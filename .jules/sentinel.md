## 2024-05-29 - [Insecure Temporary File Creation]
 **Vulnerability:** Unsafe creation of temporary SSH config files with predictable names directly in `os.tmpdir()` (`/tmp`).
 **Learning:** Using predictable file paths in shared directories like `/tmp` leaves the system vulnerable to symlink attacks or file hijacking, where an attacker can pre-create the file to gain unauthorized access or overwrite arbitrary files.
 **Prevention:** Always use safe primitives like `fs.mkdtempSync` alongside `os.tmpdir()` to create a uniquely named, secure directory (`0700` permissions by default in Node.js) for placing sensitive temporary files.
