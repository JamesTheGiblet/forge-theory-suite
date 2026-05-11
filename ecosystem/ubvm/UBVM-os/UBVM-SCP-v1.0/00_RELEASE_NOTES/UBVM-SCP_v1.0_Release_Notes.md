# UBVM/SCP v1.0 — Release Notes
## Universal Behavioural Virtual Machine · Semantic Capsule Protocol

```
Release:      v1.0
Date:         May 2025
Status:       FIRST PUBLISHED RELEASE
Author:       James Gilbert, Forge Theory Labs / Giblets Creations, England
Document ref: UBVM-REL-001
```

---

## What This Release Is

This is the first published release of UBVM/SCP as a formal technical standard. It constitutes:

- A normative, RFC-style **protocol specification** (UBVM-SPEC-001 v1.0)
- A **reference implementation** in Node.js with 12/12 passing test vectors
- A **public audit log** from a live two-node deployment
- A **JSON Schema** for capsule format validation
- A complete **documentation suite** covering architecture, deployment, and security
- A **verification suite** for independent conformance testing
- A **public verification challenge** open to any third party
- A complete set of **cryptographic artefacts** (hash chains, containment vectors, provenance examples)

This release is the canonical v1.0. It is complete, self-contained, and independently verifiable.

---

## What Is New in v1.0

This is the first public release. There is no prior version. Everything in this bundle is new.

The following capabilities are defined and implemented:

| Capability | Status |
|-----------|--------|
| Semantic Capsule format (JSON, .scp.json) | Specified + Implemented |
| Provenance hash algorithm (SHA-256, canonical JSON) | Specified + Implemented + Test vector |
| 7-stage validation pipeline | Specified + Implemented + All stages tested |
| Containment classes CC0–CC5 | Specified + Implemented + All classes exercised |
| Primitive dispatch table | Specified + Implemented (6 core + extensible) |
| Audit log format | Specified + Implemented + Live log published |
| Event bus protocol | Specified + Implemented |
| Multi-node scoped execution | Specified + Implemented |
| Cross-node authorisation | Specified + Implemented |
| Error codes (13 codes) | Specified + Implemented |
| Conformance requirements | Specified |
| JSON Schema for capsules | Published |
| Verification suite | Published |
| Public verification challenge | Open |

---

## Known Limitations in v1.0

The following are known scope boundaries of this release, not defects:

1. **Key management** — This specification defines the hash chain and provenance model but does not specify a PKI or key management infrastructure. Deployments requiring cryptographic signing of capsules beyond the hash chain should follow NIST SP 800-57 or equivalent. A future version will specify a signing extension.

2. **Transport** — The protocol specifies capsule format and runtime behaviour. Network transport of capsules between nodes is implementation-defined. A future version may specify a capsule transport protocol.

3. **auth_token format** — The cross-node auth_token field is specified as opaque in v1.0. A future version will specify a standard JWT-based format.

4. **Persistent duplicate store** — The session-scoped duplicate check (Stage 7) does not specify a persistence format for cross-restart replay prevention. Operators requiring this should maintain their own executed-ID store.

5. **Embedded targets** — While the specification is designed for microcontroller portability, no embedded reference implementation is included in v1.0. A C reference implementation targeting ARM Cortex-M is planned.

---

## Verification

This release has been verified as follows:

| Verification | Method | Result |
|-------------|--------|--------|
| Test vector suite | `node ubvm.js test` | 12/12 PASS |
| Hash vector 1 | Canonical hash of spec §14.1 input | `cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff` |
| Provenance enforcement | V-02 tamper test | REJECTED at Stage 2, PROVENANCE_INVALID |
| Containment enforcement | V-04 privilege escalation | REJECTED at Stage 4, CONTAINMENT_VIOLATION |
| Scope isolation | V-03 wrong node | REJECTED at Stage 3, SCOPE_MISMATCH |
| Replay prevention | V-07 duplicate capsule | REJECTED at Stage 7, DUPLICATE_CAPSULE_ID |
| Live deployment | Two-node Hetzner VPS | Active, audit log published |

Full verification instructions: `00_RELEASE_NOTES/Verification_Instructions.md`

---

## How to Use This Bundle

```
1. Read this file (you are here)
2. Read 00_RELEASE_NOTES/Verification_Instructions.md
3. Open 01_SPECIFICATION/UBVM-SPEC-001_v1.0.md — the normative reference
4. Run 02_REFERENCE_IMPLEMENTATION/ubvm.js test — verify conformance locally
5. Inspect 03_PUBLIC_AUDIT_LOG/public_audit_log.json — the live evidence
6. Review 04_LICENSING/ — IP and licence terms
7. Run 07_VERIFICATION_SUITE/ tools — independent verification
8. Attempt 08_PUBLIC_VERIFICATION_CHALLENGE/ — third-party legitimacy
```

---

## Provenance of This Release

This release bundle was produced by James Gilbert, sole author and inventor of UBVM/SCP, trading as Giblets Creations and Forge Theory Labs, England. It was built in Termux on a Samsung Galaxy S24 Ultra.

The release bundle is protected under the Copyright, Designs and Patents Act 1988. All IP belongs to the author. The Meaning Sovereignty Licence v1.0 governs use.

Publication of this release constitutes public disclosure of the UBVM/SCP protocol. This disclosure establishes a public prior art date for all technical claims described herein.

---

*UBVM-REL-001 · v1.0 · May 2025*
*© 2025 James Gilbert · Forge Theory Labs · Giblets Creations · England*

---

## Public Disclosure Record

This release was publicly disclosed via Git commit on **11 May 2026**.

| Field | Value |
|-------|-------|
| Commit hash | `548e0e28` |
| Branch | `main` |
| Commit message | `UBVM/SCP v1.0 — First published release` |
| Repository | https://github.com/JamesTheGiblet/forge-theory-suite |
| Disclosure date | 11 May 2026 |
| Author | James / Giblets Creations / Forge Theory Labs, England |

This timestamp constitutes public disclosure of the UBVM/SCP protocol and all technical claims described in this release bundle. It establishes the prior art date for patent assessment purposes.

*Record appended: 11 May 2026*
