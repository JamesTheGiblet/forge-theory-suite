# How to Verify UBVM/SCP
## A Plain-English Verification Guide

---

## What You Are Verifying

You are verifying that the UBVM/SCP protocol:
1. Is precisely specified (readable and unambiguous)
2. Is correctly implemented (reference implementation matches spec)
3. Behaves as claimed (tamper detection, containment, scope isolation work)

---

## The Single Most Important Verification (5 minutes)

```bash
node 02_REFERENCE_IMPLEMENTATION/ubvm.js test
```

Look for: `Results: 12 passed, 0 failed`

And this specific line: `ℹ Hash vector 1: cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff`

If you see those two things, you have confirmed:
- The implementation is deterministic
- Hash computation matches the specification
- All seven validation rules fire correctly on their respective test vectors

---

## The Hash Algorithm in Plain English

The spec says: to hash a capsule, take the JSON, remove the `sha256` and `metadata` fields, sort all keys alphabetically (at every level, recursively), serialise to compact JSON with UTF-8 encoding, and run SHA-256.

You can implement this in 15 lines in any language. If your implementation produces `cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff` for the Test Vector 1 input, you have independently verified the core cryptographic claim.

---

## Why the Public Audit Log Matters

Open `03_PUBLIC_AUDIT_LOG/public_audit_log.json`. Look for:

- `CAPSULE_REJECTED` records with `error_code: "PROVENANCE_INVALID"` — this is the tamper detection firing in production
- `CAPSULE_REJECTED` records with `error_code: "SCOPE_MISMATCH"` — this is the node isolation firing
- `CAPSULE_REJECTED` records with `error_code: "CONTAINMENT_VIOLATION"` — this is the containment enforcement firing
- `CAPSULE_ACCEPTED` and `CAPSULE_EXECUTED` records — these are normal operations completing

All of these happened in a real running deployment. The timestamps are real. The capsule IDs are real UUIDs. The record IDs are real UUIDs. Nothing is mocked.

---

*UBVM-HOWVERIFY-001 · v1.0 · May 2025*
