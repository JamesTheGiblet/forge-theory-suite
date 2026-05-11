# Capsule Author's Guide
## How to create, sign, and submit Semantic Capsules

**Spec reference:** UBVM-SPEC-001 v1.0 §5
**Document ref:** UBVM-DOC-CAG-001

---

## The Golden Rule

A capsule is a promise. The `intent.declared` field is what you say you are going to do. The `containment_class` is the maximum permission you claim to need. The `primitives` list is the exact set of operations you will invoke.

The UBVM runtime holds you to all three. Declare what you need. No more.

---

## Building a Capsule

Always use `buildCapsule()` from the reference implementation or an equivalent conforming builder. Never manually compute the hash — use the builder, which calls `canonicalHash()` automatically.

```javascript
const { buildCapsule } = require('./ubvm.js');

const capsule = buildCapsule({
  node_scope: 'your-node-scope',
  intent: {
    declared:    'Describe exactly what this capsule will do, in plain language',
    category:    'ANALYSIS',   // or GENERATION, EXECUTION, COMMUNICATION, MUTATION, CONTAINMENT
    sensitivity: 'LOW'         // or MEDIUM, HIGH, CRITICAL
  },
  containment_class: 'CC3',   // use the most restrictive class that permits your primitives
  author: {
    id:   'your-operator-id',
    name: 'Your Name or Organisation'
  },
  primitives: ['READ_TEXT', 'STRUCTURE_OUTPUT'],  // only primitives you will actually invoke
  payload: {
    text: 'your input data here'
  }
});
```

The builder assigns a random UUID v4 `capsule_id` and the current timestamp. It then computes the hash and inserts it into `provenance.sha256`.

---

## Choosing a Containment Class

Pick the most restrictive class that includes the primitives you need:

| I need to... | Use class |
|-------------|-----------|
| Only read text and structure output | CC4 or CC5 |
| Read documents and produce structured output | CC3 |
| Invoke a language model | CC2 |
| Write to a file or fetch a URL | CC1 |
| Everything / administrative operation | CC0 (operator only) |

When in doubt, use CC3. You can always re-author a capsule with a higher class if you find you need more permission.

---

## Declaring Primitives

Only list primitives you will actually invoke. The runtime will check:
1. That every primitive in the list is registered on the executing node
2. That no primitive in the list requires a higher class than your declared `containment_class`

If you list `WRITE_FILE` (min_class CC1) but declare `containment_class: "CC3"`, the capsule will be rejected at Stage 4.

---

## Lineage and Parent Capsules

If your capsule is part of a sequence, set `parent_capsule_id`:

```javascript
const capsule = buildCapsule({
  // ... other fields ...
  parent_capsule_id: rootCapsule.capsule_id
});
```

This creates a verifiable hash chain from your capsule back to the root. The chain is automatically verifiable with `07_VERIFICATION_SUITE/verify_hash_chain.js`.

---

## Verifying Your Capsule Before Submission

```bash
node ubvm.js hash my-capsule.scp.json
# Should output the same hash as provenance.sha256 in the file
```

Or validate against the JSON Schema:
```bash
ajv validate -s 01_SPECIFICATION/schema/scp_capsule_schema_v1.0.json -d my-capsule.scp.json
```

---

## What You Must Not Do

- Do not modify any capsule field after computing the hash without rebuilding the capsule
- Do not reuse a `capsule_id` — each capsule must have a unique UUID
- Do not set `intent.declared` to a generic or empty description — it is your declared promise and part of the audit trail
- Do not list primitives you do not need — every listed primitive expands your permission surface
- Do not set `expiry` in the past (unless intentionally creating a test vector for V-06)

---

*UBVM-DOC-CAG-001 · v1.0 · May 2025*
