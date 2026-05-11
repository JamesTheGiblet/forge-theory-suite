# Security Model Overview
## UBVM/SCP Threat Model and Security Properties

**Spec reference:** UBVM-SPEC-001 v1.0 §16
**Document ref:** UBVM-DOC-SEC-001

---

## Security Properties

UBVM/SCP provides the following security guarantees when correctly deployed:

### 1. Intent Integrity
The `intent.declared`, `containment_class`, `primitives`, and `author` fields are all part of the capsule hash. Any post-authorship modification invalidates the hash and causes Stage 2 rejection. An attacker cannot change what a capsule claims to do without detection.

### 2. Containment Enforcement
The runtime enforces containment classes before any handler is invoked. A capsule cannot invoke an operation outside its declared class regardless of what the handler implementation supports. This is runtime-level enforcement — it cannot be bypassed by a crafted payload.

### 3. Scope Isolation
A capsule cannot execute on an unintended node. Stage 3 rejects any capsule whose `node_scope` doesn't match the executing node's NSI. Cross-node execution requires an explicit, time-limited, authorised token.

### 4. Replay Prevention
Stage 7 rejects any capsule whose `capsule_id` has been executed in the current session. For cross-restart replay prevention, operators should maintain a persistent executed-ID store.

### 5. Audit Non-Repudiation
Every execution and rejection produces an append-only audit record. The record includes the capsule's `declared` intent, `author.id`, `containment_class`, and the exact stage and error code of any rejection. This record is sufficient to reconstruct the full execution history.

### 6. Sovereign Operation
No external service is required. An attacker cannot disable UBVM by taking down a licence server, a certificate authority, or a cloud API endpoint.

---

## Threat Vectors and Mitigations

| Threat | UBVM Mitigation |
|--------|----------------|
| Capsule tampering in transit | Stage 2: Hash verification rejects any modified capsule |
| Privilege escalation via crafted payload | Stage 4: Containment class checked before handler invoked |
| Lateral movement between nodes | Stage 3: NSI check with cross_node_auth requirement |
| Replay attack | Stage 7: Duplicate capsule_id rejected |
| Intent spoofing | `intent.declared` is hashed — cannot be changed without invalidating capsule |
| Audit log tampering | Append-only log; high-assurance deployments should add log hash chain |
| Vendor access to operations | Sovereign operation: no external API calls required |

---

## Limitations and Out-of-Scope Threats

- **Key management:** UBVM does not manage signing keys. Operators are responsible for securing operator IDs and, if using signed tokens for cross-node auth, managing those keys per NIST SP 800-57.
- **Physical security:** UBVM does not protect against an attacker with direct physical access to the node hardware.
- **Malicious primitive handlers:** Custom primitive handlers are operator-written code. UBVM enforces that they are only invoked within the declared containment class, but cannot protect against a malicious handler implementation.
- **Hash algorithm future:** SHA-256 is current best practice. Future UBVM versions should plan for migration to SHA-3.

---

## Security Contact

To report security issues with the UBVM/SCP specification or reference implementation, contact: [your security contact email]

---

*UBVM-DOC-SEC-001 · v1.0 · May 2025*
*© 2025 James [Surname] · Forge Theory Labs · Giblets Creations · England*
