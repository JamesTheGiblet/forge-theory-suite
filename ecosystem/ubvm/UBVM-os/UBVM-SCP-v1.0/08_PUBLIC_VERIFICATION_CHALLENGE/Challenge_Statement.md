# UBVM/SCP Public Verification Challenge
## Open to Any Third Party — No Registration Required

**Issued by:** Forge Theory Labs / Giblets Creations, England
**Date:** May 2025
**Status:** OPEN

---

## The Challenge

We claim the following about UBVM/SCP v1.0:

> **Claim 1 — Hash Determinism**
> Any conforming implementation of the canonical hash algorithm (UBVM-SPEC-001 §9.1) will produce the value `cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff` for Test Vector 1 (see `KnownGoodResults/expected_hashes.json`).

> **Claim 2 — Validation Determinism**
> Any conforming implementation of the 7-stage validation pipeline (UBVM-SPEC-001 §8.1) will produce the exact rejection/acceptance results listed in `KnownGoodResults/expected_validation_results.json` for each test vector.

> **Claim 3 — Containment Enforcement**
> No capsule declaring containment class CC3 can invoke a primitive with `min_class: CC1` in any conforming UBVM implementation. This is verifiable by implementing the Stage 4 check and attempting V-04.

> **Claim 4 — Tamper Detection**
> Any modification to any field of a capsule (other than `metadata`) will produce a different SHA-256 hash, causing Stage 2 rejection. This is verifiable by modifying V-01 and attempting to execute it.

---

## How to Attempt the Challenge

You do not need our code. The specification is sufficient.

### Path A — Use the Reference Implementation

```bash
git clone https://github.com/ForgeTheoryLabs/ubvm.git
cd ubvm
node ubvm.js test
```

Expected: 12/12 passing. Hash vector 1: `cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff`

### Path B — Implement from the Specification

1. Read `01_SPECIFICATION/UBVM-SPEC-001_v1.0.md` §9.1 (canonical hash algorithm)
2. Implement the algorithm in any language
3. Apply it to the test vector in `02_REFERENCE_IMPLEMENTATION/test_vectors/V-01_valid_capsule.json`
4. Compare your result to `cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff`

If they match, you have independently verified Claim 1 without using our code.

### Path C — Run the Verification Suite

```bash
cd 07_VERIFICATION_SUITE
node verify_hash_chain.js    ../06_ARTIFACTS/hash_chains/
node verify_capsule_validity.js  ../02_REFERENCE_IMPLEMENTATION/test_vectors/
node verify_audit_log.js     ../03_PUBLIC_AUDIT_LOG/public_audit_log.json
```

All three should pass with zero errors.

---

## What Independent Verification Achieves

If any third party implements the hash algorithm from the specification and produces the same result as our reference implementation, this demonstrates:

1. The protocol specification is precise enough to implement independently
2. The protocol is deterministic — different implementations agree
3. The technical claims in the specification are verifiable, not merely asserted

This is the same standard applied to TLS, WebAssembly, and OAuth. We hold UBVM/SCP to the same bar.

---

## Reporting Results

If you attempt the challenge and produce results — pass or fail — we welcome public reporting. You can:

- Open a GitHub issue on the UBVM repository with your results
- Reference this document and your implementation language/platform
- Include the hash you computed for V-01

Independent verification results will be published in a future release.

---

## What We Are Not Claiming

We are not claiming UBVM/SCP is production-ready for every use case. We are not claiming the reference implementation is free of bugs. We are not claiming the protocol is perfect.

We are claiming it is **real**, **specified**, **implemented**, and **verifiable**. Those four properties are the only ones required for a technical standard.

---

*UBVM-CHALLENGE-001 · v1.0 · May 2025*
*© 2025 James [Surname] · Forge Theory Labs · Giblets Creations · England*
