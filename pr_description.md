## 🎯 What

The `hashCredential` function previously used an unsalted SHA-256 algorithm to hash credentials, which is insecure and vulnerable to rainbow table attacks and brute-forcing.

## ⚠️ Risk

If an attacker gains access to the local sandbox state or the registry payload where these hashes are stored, they could rapidly compute plaintexts using hardware acceleration or pre-computed hash tables, compromising the messaging bridge tokens or router credentials.

## 🛡️ Solution

- Migrated the hashing implementation to use Node.js's native `crypto.scryptSync` with a random 16-byte salt per hash.
- Implemented `verifyCredential` using `crypto.timingSafeEqual` to securely compare plaintexts against stored salted hashes.
- Retained a fallback in `verifyCredential` to support legacy, unsalted SHA-256 hashes for backwards compatibility with existing active deployments.
- Updated conflict detection logic to pass plaintexts safely for in-memory resolution where strict equality checks on hashes are mathematically impossible with distinct salts.

Signed-off-by: Jules <jules@nemo.claw>
