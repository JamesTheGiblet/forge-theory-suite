# UBVM/SCP Verification Suite
## Independent Verification Tools

Three tools for independently verifying the correctness of this release bundle.
All tools exit with code 0 on success, 1 on failure. All output is human-readable.

---

## Tools

### verify_hash_chain.js
Verifies that a directory of capsules form a valid, unbroken hash chain.

```bash
node verify_hash_chain.js <directory>
node verify_hash_chain.js ../06_ARTIFACTS/hash_chains/
```

Checks: SHA-256 of each capsule matches `provenance.sha256`; parent capsule hashes also verified.
Spec reference: UBVM-SPEC-001 §9.3

---

### verify_capsule_validity.js
Verifies a directory of capsules for schema compliance and provenance integrity.

```bash
node verify_capsule_validity.js <directory>
node verify_capsule_validity.js ../02_REFERENCE_IMPLEMENTATION/test_vectors/
```

Checks: required fields present, correct types, valid enum values, hash integrity.
Tampered test vectors (V-02) are flagged as expected.
Spec reference: UBVM-SPEC-001 §5, §9.1

---

### verify_audit_log.js
Verifies the structural integrity of a public audit log export.

```bash
node verify_audit_log.js <path-to-log.json>
node verify_audit_log.js ../03_PUBLIC_AUDIT_LOG/public_audit_log.json
```

Checks: record_id UUID format, ISO 8601 timestamps, valid record types, presence of node_scope.
Spec reference: UBVM-SPEC-001 §12

---

## Running All Three

```bash
cd 07_VERIFICATION_SUITE
node verify_hash_chain.js    ../06_ARTIFACTS/hash_chains/       && echo "CHAIN: PASS"
node verify_capsule_validity.js  ../02_REFERENCE_IMPLEMENTATION/test_vectors/ && echo "VALIDITY: PASS"
node verify_audit_log.js     ../03_PUBLIC_AUDIT_LOG/public_audit_log.json && echo "AUDIT: PASS"
```

Expected: all three output PASS with zero errors.

---

*UBVM-DOC-VS-001 · v1.0 · May 2025*
