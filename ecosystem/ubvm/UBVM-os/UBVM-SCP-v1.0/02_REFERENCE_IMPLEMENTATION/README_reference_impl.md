# UBVM/SCP Reference Implementation

**Universal Behavioural Virtual Machine · Semantic Capsule Protocol**

> *A sovereign, portable AI behavioural runtime. Executes declared-intent capsules with cryptographic provenance and runtime-enforced containment. No cloud. No vendor. No black box.*

---

## Status

| Component | Status |
|-----------|--------|
| Specification | UBVM-SPEC-001 v1.0 — Published |
| Reference Implementation | v1.0 — Passing 12/12 test vectors |
| Live Deployment | Two nodes active (forge-analysis-01, forge-storage-01) |
| Licence | Meaning Sovereignty Licence v1.0 |

---

## What This Is

UBVM is a runtime that executes **Semantic Capsules** — JSON artefacts encoding:

- **Declared intent** — what the agent is intended to do, in human-readable form, hashed into the capsule so it cannot be changed without detection
- **Containment class** (CC0–CC5) — what the agent is *permitted* to do, enforced by the runtime before any operation is dispatched
- **Cryptographic provenance** — a SHA-256 hash chain from every capsule back to its lineage root
- **Scoped node binding** — a capsule scoped to node A cannot execute on node B without explicit cross-node authorisation

The result: every AI operation is a signed, auditable, containment-enforced artefact. You know what it was supposed to do, what it was allowed to do, and whether it was tampered with.

---

## Quick Start

```bash
git clone https://github.com/ForgeTheoryLabs/ubvm.git
cd ubvm
node ubvm.js test          # run all spec §14 test vectors
```

**Expected output:**
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

---

## Execute a Capsule

```bash
# Build a capsule (computes hash automatically)
node ubvm.js build examples/analysis.template.json > my-capsule.scp.json

# Execute it
node ubvm.js exec my-capsule.scp.json --scope forge-analysis-01 --cap CC2 --log audit.log

# Verify a hash
node ubvm.js hash my-capsule.scp.json
```

---

## Capsule Format (minimal example)

```json
{
  "scp_version": "1.0",
  "capsule_id": "7f3a9b2c-1e4d-4f6a-8b0c-2d5e7f9a1b3c",
  "node_scope":  "forge-analysis-01",
  "intent": {
    "declared":    "Read the provided document and produce a structured summary",
    "category":    "ANALYSIS",
    "sensitivity": "LOW"
  },
  "containment_class": "CC3",
  "author": {
    "id":   "operator-001",
    "name": "Forge Theory Labs"
  },
  "provenance": {
    "created_at":        "2025-05-11T09:00:00Z",
    "sha256":            "a3f7b2c9...",
    "parent_capsule_id": null
  },
  "primitives": ["READ_DOCUMENT", "STRUCTURE_OUTPUT"],
  "payload": {
    "document": "..."
  }
}
```

The `sha256` field is computed by `buildCapsule()` or `node ubvm.js build`. Any modification to any other field invalidates the hash.

---

## Containment Classes

| Class | Permitted | Use |
|-------|-----------|-----|
| CC0 | Everything | Sovereign operator |
| CC1 | All primitives, network, filesystem | Trusted internal agents |
| CC2 | All primitives, no cross-node | Standard production agents |
| CC3 | Read-only, no network | Analytical agents on sensitive data |
| CC4 | Output generation only | Minimal / untrusted agents |
| CC5 | Single primitive, full audit | Contained evaluation |

---

## Programmatic Use

```javascript
const { UBVMNode, buildCapsule } = require('./ubvm.js');

// Start a node
const node = new UBVMNode({
  nodeScope:      'my-node',
  containmentCap: 'CC2',
  auditLogPath:   './audit.log'   // optional
});

// Build a capsule (hash computed automatically)
const capsule = buildCapsule({
  node_scope:        'my-node',
  intent: {
    declared:    'Summarise the input text',
    category:    'ANALYSIS',
    sensitivity: 'LOW'
  },
  containment_class: 'CC3',
  author: { id: 'my-operator', name: 'My Org' },
  primitives: ['READ_TEXT', 'STRUCTURE_OUTPUT'],
  payload: { text: 'The quick brown fox...' }
});

// Execute
const result = await node.execute(capsule);
console.log(result.accepted);  // true
console.log(result.result);    // { READ_TEXT: {...}, STRUCTURE_OUTPUT: {...} }

// Export audit log
const log = node.exportAuditLog();

// Shutdown
node.shutdown();
```

---

## Architecture

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  forge-analysis-01  (CC2 cap)   │     │  forge-storage-01   (CC1 cap)   │
│                                 │     │                                 │
│  Capsule → Validation Pipeline  │     │  Capsule → Validation Pipeline  │
│  Stage 1: Schema                │     │  Stage 1: Schema                │
│  Stage 2: Provenance hash       │     │  Stage 2: Provenance hash       │
│  Stage 3: Scope check           │────▶│  Stage 3: Scope check           │
│  Stage 4: Containment class     │     │  Stage 4: Containment class     │
│  Stage 5: Primitive reg.        │     │  Stage 5: Primitive reg.        │
│  Stage 6: Expiry                │     │  Stage 6: Expiry                │
│  Stage 7: Duplicate             │     │  Stage 7: Duplicate             │
│  → Dispatch → Audit log         │     │  → Dispatch → Audit log         │
└────────────────┬────────────────┘     └─────────────────────────────────┘
                 │
         Event Bus (shared)
```

---

## Public Audit Log

`public_audit_log.json` in this repository is a real, timestamped execution log from the UBVM reference implementation running two-node demo scenarios. It shows:

- Capsule acceptance (CC3, CC4, CC2 classes)
- `PROVENANCE_INVALID` rejection — tampered intent field detected at Stage 2
- `SCOPE_MISMATCH` rejection — cross-node capsule without authorisation at Stage 3
- `CONTAINMENT_VIOLATION` rejection — CC4 capsule requesting CC2 primitive at Stage 4
- Event bus emission
- Node B independent execution

Every record in the log contains a `record_id` (UUID), `timestamp`, `node_scope`, and `capsule_id` traceable to its capsule.

---

## Specification

Full normative specification: [`UBVM_SCP_SPEC_v1.0.md`](UBVM_SCP_SPEC_v1.0.md)

Document reference: UBVM-SPEC-001 v1.0

Sections covered: capsule format, containment classes, primitive dispatch table, validation pipeline (7 stages), provenance hash algorithm (with test vectors), event bus, multi-node scoped execution, audit log format, error codes, and conformance requirements.

---

## Licence

Meaning Sovereignty Licence v1.0. See `LICENCE.md`.

In summary: you may use, deploy, and extend UBVM/SCP. You may not modify the declared intent of a capsule you did not author and re-execute it without issuing a new capsule under your own authorship. You may not disable provenance validation in a deployment you describe as UBVM-conformant.

---

## Author

James [Surname]
Forge Theory Labs / Giblets Creations, England
Built in Termux on a Samsung Galaxy S24 Ultra.

*"I wanted it. So I forged it. Now forge yours."*

---

© 2025 James [Surname] · Forge Theory Labs · Giblets Creations · England
Protected under the Copyright, Designs and Patents Act 1988.
