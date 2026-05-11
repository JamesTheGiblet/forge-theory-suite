# UBVM Architecture Overview
## Universal Behavioural Virtual Machine — System Architecture

**Spec reference:** UBVM-SPEC-001 v1.0 §4
**Document ref:** UBVM-DOC-ARCH-001

---

## The Core Insight

Every existing AI agent framework treats intent as ephemeral. A prompt is sent. An action is taken. The relationship between the two is logged at best, verified at never.

UBVM inverts this. Intent comes first. It is declared, encoded, hashed, and bound to a capsule before any operation is dispatched. The runtime's only job is to verify the capsule and execute within its declared boundaries. Nothing can happen outside those boundaries — not because of a policy, but because the runtime won't dispatch it.

---

## System Components

### 1. The Semantic Capsule

The unit of execution. A JSON file (`.scp.json`) containing:

```
┌──────────────────────────────────────────────────┐
│  scp_version        Protocol version             │
│  capsule_id         UUID v4, globally unique     │
│  node_scope         Which node may execute this  │
│  intent             Declared purpose + category  │
│  containment_class  CC0–CC5 permission tier      │
│  author             Who created this capsule     │
│  provenance         SHA-256 + timestamp + parent │
│  primitives         Permitted operations list    │
│  payload            Capsule-specific data        │
│  [expiry]           Optional time limit          │
│  [cross_node_auth]  Optional cross-node token    │
└──────────────────────────────────────────────────┘
```

The `provenance.sha256` field is a SHA-256 hash of the capsule's canonical JSON representation (all fields except `sha256` and `metadata`, keys sorted, compact). Any modification to any other field invalidates the hash.

### 2. The Validation Pipeline (7 Stages)

Every capsule passes through seven stages before any operation is executed:

```
Capsule
  │
  ▼
Stage 1 ─ Schema validation ─────────────── REJECT: SCHEMA_MISSING_FIELD
  │                                                  SCHEMA_TYPE_ERROR
  ▼                                                  SCHEMA_INVALID_ENUM
Stage 2 ─ Provenance hash verification ──── REJECT: PROVENANCE_INVALID
  │                                                  CHAIN_INVALID
  ▼
Stage 3 ─ Node scope check ──────────────── REJECT: SCOPE_MISMATCH
  │                                                  CROSS_NODE_AUTH_INVALID
  ▼
Stage 4 ─ Containment class check ──────── REJECT: CONTAINMENT_VIOLATION
  │                                                  NODE_CLASS_EXCEEDED
  ▼
Stage 5 ─ Primitive registration check ─── REJECT: PRIMITIVE_NOT_REGISTERED
  │
  ▼
Stage 6 ─ Expiry check ─────────────────── REJECT: CAPSULE_EXPIRED
  │
  ▼
Stage 7 ─ Duplicate check ──────────────── REJECT: DUPLICATE_CAPSULE_ID
  │
  ▼
ACCEPTED → Primitive Dispatch → Audit Log
```

A failure at any stage produces a rejection record and halts. The runtime does not attempt recovery or partial execution.

### 3. The Primitive Dispatch Table

A locked, runtime-local registry. Maps primitive names to handler functions and minimum containment class requirements. The table is fixed at node startup and cannot be modified during a session.

Containment enforcement happens here: a CC4 capsule requesting a CC2 primitive is rejected at Stage 4, before the dispatch table is even consulted for the handler.

### 4. The Audit Log

Append-only, JSON-per-line, persisted before acknowledgement. Every record has a `record_id` (UUID), `timestamp` (ISO 8601 ms precision), `node_scope`, and `capsule_id`. Nine record types cover the full capsule lifecycle.

The audit log is the legal and forensic artefact. It is what you show to a regulator, a security auditor, or a court.

### 5. The Event Bus

Publish-subscribe channel for real-time observation. Seven standard events: `capsule.received`, `capsule.accepted`, `capsule.executed`, `capsule.failed`, `capsule.rejected`, `node.started`, `node.stopped`. Transport is implementation-defined; in sovereign/air-gapped deployments, an in-process EventEmitter is the fallback.

---

## Containment Class Model

```
CC0 ──── Sovereign   ─── everything, no restrictions
CC1 ──── Trusted     ─── all primitives, network, filesystem
CC2 ──── Standard    ─── all primitives, no unauthenticated cross-node
CC3 ──── Restricted  ─── read-only, no network, no filesystem write
CC4 ──── Minimal     ─── output generation only
CC5 ──── Contained   ─── single primitive, full audit
```

The containment class is declared *by the capsule*, not imposed by the node. The node imposes a *cap* — a ceiling it will accept. A node configured with cap CC2 will reject any capsule declaring CC0 or CC1 regardless of content.

This separation matters: it means a node can be permanently restricted to a certain trust level, regardless of what capsules are submitted to it.

---

## Multi-Node Topology

```
              ┌────────────────────────────┐
              │  UBVM Deployment           │
              │                            │
  ┌──────────▼──────────┐  ┌──────────────▼────────────┐
  │  forge-analysis-01  │  │  forge-storage-01          │
  │  NSI: analysis      │  │  NSI: storage              │
  │  Cap: CC2           │  │  Cap: CC1                  │
  │  Primitives:        │  │  Primitives:               │
  │  - READ_DOCUMENT    │  │  - WRITE_FILE              │
  │  - GENERATE_TEXT    │  │  - LOG_AUDIT               │
  │  - STRUCTURE_OUTPUT │  │  - EMIT_EVENT              │
  │  - LOG_AUDIT        │  │                            │
  └──────────┬──────────┘  └────────────────────────────┘
             │
         Event Bus
             │
         (shared pub/sub)
```

Each node's NSI is its identity. Capsules are scoped to a node at authorship time. The only way a capsule crosses a node boundary is with an explicit `cross_node_auth` block signed by an authorising node.

---

## The Hash Chain

Every capsule carries a `parent_capsule_id`. This creates a chain:

```
Root Capsule (parent: null)
  │
  └─ sha256: 35fbfe42...
       │
       ▼
Intermediate Capsule (parent: root)
  │
  └─ sha256: 2906b7c0...
         │
         ▼
Leaf Capsule (parent: intermediate)
  │
  └─ sha256: 752bb93b...
```

Verifying the chain means verifying each capsule's hash and following `parent_capsule_id` back to the root. If any link is broken — by tampering, substitution, or corruption — verification fails.

This chain is portable. It travels with the capsules. It requires no server, no PKI, no network call to verify.

---

## Sovereign Operation

UBVM's design goal G1 is sovereignty: a conforming deployment must operate without any external network dependency.

This means:
- No licence check-in
- No telemetry
- No model API call (GENERATE_TEXT can invoke a locally-hosted model)
- No capsule registry call required for execution
- No update mechanism requiring internet access

A UBVM node can run indefinitely in an air-gapped environment. The audit log and event bus are fully local.

---

*UBVM-DOC-ARCH-001 · v1.0 · May 2025*
*© 2025 James Gilbert · Forge Theory Labs · Giblets Creations · England*
