# Verification Instructions
## UBVM/SCP v1.0 Release Bundle

This document explains how to independently verify that this release bundle is authentic, unmodified, and that the reference implementation behaves exactly as the specification claims.

---

## Prerequisites

- Node.js v18 or later
- A terminal / command line
- (Optional) Python 3 for JSON inspection
- (Optional) sha256sum or equivalent for file hash verification

---

## Step 1 — Verify the Reference Implementation Against Test Vectors

```bash
cd 02_REFERENCE_IMPLEMENTATION
node ubvm.js test
```

**Expected output (all 12 must pass):**
```
═══════════════════════════════════════════
 UBVM/SCP Test Vector Suite — Spec §14
═══════════════════════════════════════════

── Hash Computation ─────────────────────
  ✓ Hash is deterministic
  ✓ Hash is 64 hex chars
  ℹ Hash vector 1: cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff

── Validation Vectors ───────────────────
  ✓ V-01 Valid CC3 capsule → ACCEPTED
  ✓ V-02 Tampered intent → REJECTED
  ✓ V-02 Error code PROVENANCE_INVALID
  ✓ V-03 Wrong scope → REJECTED
  ✓ V-03 Error SCOPE_MISMATCH
  ✓ V-04 CC3 capsule + CC1 primitive → REJECTED
  ✓ V-04 Error CONTAINMENT_VIOLATION
  ✓ V-05 Unregistered primitive → REJECTED
  ✓ V-06 Expired capsule → REJECTED
  ✓ V-07 Duplicate capsule_id → REJECTED on second

═══════════════════════════════════════════
 Results: 12 passed, 0 failed
═══════════════════════════════════════════
```

If any test fails, the implementation does not conform to this release. Do not use it.

---

## Step 2 — Verify Hash Vector 1 Independently

The canonical test vector 1 hash is specified in §14.1 of the specification. You can verify it independently without running the test suite:

```bash
cd 02_REFERENCE_IMPLEMENTATION
node ubvm.js hash test_vectors/V-01_valid_capsule.json
```

**Expected output:**
```
cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff
```

If you get a different value, the capsule file or the hash implementation has been modified.

---

## Step 3 — Verify the Individual Test Vector Capsules

Each test vector capsule in `02_REFERENCE_IMPLEMENTATION/test_vectors/` includes its expected SHA-256 in the `provenance.sha256` field. Verify each:

```bash
cd 02_REFERENCE_IMPLEMENTATION
for f in test_vectors/V-0*.json; do
  echo -n "$f: "
  computed=$(node ubvm.js hash "$f")
  declared=$(node -e "const c=require('./$f'); console.log(c.provenance.sha256)")
  [ "$computed" = "$declared" ] && echo "HASH OK" || echo "HASH MISMATCH"
done
```

All files should output `HASH OK`.

---

## Step 4 — Run the Verification Suite

```bash
cd 07_VERIFICATION_SUITE
node verify_hash_chain.js    ../06_ARTIFACTS/hash_chains/
node verify_capsule_validity.js  ../02_REFERENCE_IMPLEMENTATION/test_vectors/
node verify_audit_log.js     ../03_PUBLIC_AUDIT_LOG/public_audit_log.json
```

Each tool outputs a pass/fail report. See `07_VERIFICATION_SUITE/README_verification_suite.md` for full documentation.

---

## Step 5 — Verify the Public Audit Log Structure

```bash
node 07_VERIFICATION_SUITE/verify_audit_log.js \
  03_PUBLIC_AUDIT_LOG/public_audit_log.json
```

This checks that the audit log contains the expected record types, that all capsule_ids are UUID v4 format, and that timestamps are ISO 8601.

Compare the output against:
`08_PUBLIC_VERIFICATION_CHALLENGE/KnownGoodResults/expected_audit_log_structure.json`

---

## Step 6 — Verify the JSON Schema

The capsule JSON Schema is at `01_SPECIFICATION/schema/scp_capsule_schema_v1.0.json`. Validate any capsule against it:

```bash
# Using ajv (npm install -g ajv-cli)
ajv validate -s 01_SPECIFICATION/schema/scp_capsule_schema_v1.0.json \
             -d 02_REFERENCE_IMPLEMENTATION/test_vectors/V-01_valid_capsule.json
```

---

## Step 7 — Attempt the Public Verification Challenge

See `08_PUBLIC_VERIFICATION_CHALLENGE/Challenge_Statement.md` for the open challenge.

Any party that independently implements the hash algorithm (§9.1 of the spec) and produces `cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff` for Vector 1 has independently verified the core protocol claim.

---

## What Successful Verification Proves

Completing the above steps demonstrates:

1. The reference implementation is deterministic — the same capsule produces the same hash on any conforming system
2. The validation pipeline rejects tampered, misscoped, overprovisioned, expired, and replayed capsules exactly as the specification describes
3. The hash chain artefacts are cryptographically sound
4. The public audit log is structurally valid and contains the expected event sequence
5. The JSON Schema correctly validates conforming capsules

---

*UBVM-VERIFY-001 · v1.0 · May 2025*
*© 2025 James [Surname] · Forge Theory Labs · Giblets Creations · England*
