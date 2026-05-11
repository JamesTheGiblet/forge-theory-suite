# Independent Reviewer Checklist
## UBVM/SCP v1.0

For any reviewer — security researcher, patent examiner, enterprise architect, government technical assessor — conducting an independent evaluation of UBVM/SCP.

---

## Tier 1 — Minimal (30 minutes)

- [ ] Run `node ubvm.js test` and confirm 12/12 passing
- [ ] Confirm hash vector 1 output: `cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff`
- [ ] Confirm V-02 (tampered capsule) is rejected with `PROVENANCE_INVALID`
- [ ] Confirm V-04 (containment violation) is rejected with `CONTAINMENT_VIOLATION`
- [ ] Read `01_SPECIFICATION/UBVM-SPEC-001_v1.0.md` abstract and sections 1–4

**Minimum conclusion from Tier 1:** The reference implementation passes its own test vectors. The hash algorithm is deterministic.

---

## Tier 2 — Standard (2–3 hours)

All of Tier 1, plus:

- [ ] Read the full specification (UBVM-SPEC-001 §1–17)
- [ ] Run all three verification suite tools (`07_VERIFICATION_SUITE/`)
- [ ] Inspect the public audit log and verify it matches the known-good structure
- [ ] Implement the canonical hash algorithm (§9.1) independently in any language and verify V-01
- [ ] Validate V-01 against the JSON Schema (`01_SPECIFICATION/schema/scp_capsule_schema_v1.0.json`)
- [ ] Verify the hash chain artefacts (`06_ARTIFACTS/hash_chains/`)

**Minimum conclusion from Tier 2:** The specification is implementable. The protocol's core cryptographic claims are independently reproducible.

---

## Tier 3 — Deep Technical (1–2 days)

All of Tier 2, plus:

- [ ] Implement a minimal UBVM runtime from the specification (no reference to `ubvm.js`)
- [ ] Confirm your implementation produces the same validation results for all 7 test vectors
- [ ] Attempt to find a capsule that passes Stage 2 (hash validation) despite having a different `intent.declared` field — this should be impossible
- [ ] Attempt to find a CC3 capsule that can invoke a CC1 primitive — this should be impossible
- [ ] Review the security model (`05_DOCUMENTATION/Security_Model_Overview.md`) and identify any gaps

**Minimum conclusion from Tier 3:** The specification is sufficient for independent implementation. The security properties hold.

---

## For Patent Examiners

Key claims to evaluate:
- C-01: The canonical hash algorithm (§9.1) applied to AI behavioural intent capsules
- C-03: Multi-node scoped execution with containment enforcement at the semantic capsule level
- C-04: Runtime-enforced containment classes applied to AI primitive dispatch

Prior art to review: Docker (OS-level isolation), LangChain (no capsule format, no provenance), WebAssembly (general purpose, not AI-semantic), OpenAI Agents (cloud-dependent, no containment class, no provenance).

Evidence of reduction to practice: `03_PUBLIC_AUDIT_LOG/public_audit_log.json` (live two-node deployment).

---

## For Government / Defence Technical Assessors

Key properties relevant to high-integrity environments:
- Air-gap readiness: sovereign operation (G1 in the specification)
- Provenance chain: §9 — tamper-evident, verifiable offline, no server required
- Containment classes: §6 — maps to classification levels (see Document 06 in the IP & Commercial Package)
- Audit log: §12 — append-only, JSON, SIEM-ingestible

Live deployment evidence: `03_PUBLIC_AUDIT_LOG/public_audit_log.json`

---

*UBVM-CHECKLIST-001 · v1.0 · May 2025*
