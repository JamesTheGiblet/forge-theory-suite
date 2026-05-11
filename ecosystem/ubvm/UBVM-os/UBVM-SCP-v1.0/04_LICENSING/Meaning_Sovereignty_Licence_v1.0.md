# Meaning Sovereignty Licence v1.0
## UBVM / SCP / Semantic Capsule Protocol

**Issued by:** James Gilbert, Forge Theory Labs / Giblets Creations, England
**Date:** May 2025
**Applies to:** All works in this release bundle

---

## Preamble

Software licences typically govern copying, redistribution, and modification of code. This licence governs something different: the meaning of the instructions encoded in capsules executed by UBVM runtimes.

The Meaning Sovereignty Licence is based on the principle that the declared intent of an AI behavioural capsule belongs to its author. You may deploy, run, extend, and build upon UBVM/SCP. You may not subvert the meaning of capsules you did not author.

---

## Grant of Rights

Subject to the terms below, you are granted the following rights:

1. **Use:** You may use UBVM/SCP for any purpose, commercial or non-commercial.
2. **Deploy:** You may deploy UBVM nodes and execute capsules in any environment.
3. **Extend:** You may register custom primitives and build applications on UBVM/SCP.
4. **Distribute:** You may distribute this software and specification, unmodified, with attribution.
5. **Implement:** You may create independent implementations of the UBVM/SCP protocol, provided they conform to the specification and do not misrepresent themselves as the canonical reference implementation.

---

## Conditions

**Condition 1 — Attribution**
Any deployment, distribution, or publication of UBVM/SCP or derivative works must include attribution: "Built on UBVM/SCP by Forge Theory Labs / James Gilbert, England."

**Condition 2 — Meaning Preservation**
You must not modify the `intent.declared` field of any capsule you did not author and re-execute it under the original author's identity. If you wish to re-purpose a capsule, you must re-author it under your own `author.id` with a new `capsule_id` and recomputed hash.

**Condition 3 — Provenance Integrity**
You must not deploy modifications to the UBVM runtime that disable, bypass, or weaken Stage 2 (provenance hash verification) in a deployment you describe as UBVM-conformant. Deployments that disable provenance verification must not claim UBVM conformance.

**Condition 4 — Containment Honesty**
You must not deploy modifications to the UBVM runtime that allow a capsule to exceed its declared containment class in a deployment you describe as UBVM-conformant.

**Condition 5 — Audit Retention**
Production deployments must retain audit logs for a minimum of 90 days.

---

## Restrictions

You may not:
- Claim that a modified runtime that disables provenance or containment enforcement is UBVM-conformant
- Use UBVM/SCP to execute capsules whose declared intent is a material misrepresentation of the operation actually performed
- Remove or alter copyright notices or this licence from distributed copies

---

## Disclaimer

THIS SOFTWARE AND SPECIFICATION ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. THE AUTHOR ACCEPTS NO LIABILITY FOR ANY DAMAGES ARISING FROM USE OF UBVM/SCP.

---

## Governing Law

This licence is governed by the laws of England and Wales.

---

*Meaning Sovereignty Licence v1.0*
*© 2025 James Gilbert · Forge Theory Labs · Giblets Creations · England*
