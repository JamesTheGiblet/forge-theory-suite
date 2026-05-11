# UBVM/SCP Technical Specification
## Version 1.0 — May 2025

```
Document:     UBVM-SPEC-001
Title:        Universal Behavioural Virtual Machine and
              Semantic Capsule Protocol — Technical Specification
Version:      1.0
Status:       PUBLISHED
Author:       James [Surname]
Organisation: Forge Theory Labs / Giblets Creations, England
Licence:      Meaning Sovereignty Licence v1.0
Date:         May 2025
Repository:   https://github.com/ForgeTheoryLabs/ubvm
```

---

## Abstract

This document specifies the **Universal Behavioural Virtual Machine (UBVM)** and the **Semantic Capsule Protocol (SCP)**. UBVM is a portable, architecture-agnostic AI behavioural runtime. SCP is the capsule encoding and provenance protocol it consumes.

Together they define a system in which AI agent intent is expressed as a discrete, cryptographically-provenienced, containment-classed artefact — the **Semantic Capsule** — which a conforming UBVM runtime validates and executes within declared scope boundaries.

This specification is normative. Implementations that deviate from any MUST/MUST NOT/SHALL/SHALL NOT requirement are non-conforming.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## Status of This Document

This is the first published version of the UBVM/SCP specification. It defines the v1.0 protocol. Future versions will be issued under the same document series with incremented version numbers.

This specification is published by Forge Theory Labs as the canonical normative reference for UBVM/SCP conformance.

---

## Table of Contents

1. Introduction
2. Design Goals
3. Terminology
4. System Architecture
5. The Semantic Capsule — Format Specification
6. Containment Classes
7. The Primitive Dispatch Table
8. The UBVM Runtime — Execution Model
9. Provenance Validation Algorithm
10. The Event Bus
11. Multi-Node Architecture and Scoped Execution
12. The Audit Log
13. Error Codes and Rejection Records
14. Test Vectors
15. Conformance Requirements
16. Security Considerations
17. Intellectual Property Notice

---

## 1. Introduction

### 1.1 Motivation

The current generation of AI agent frameworks produces no verifiable record of agent intent. An AI agent may log its outputs, but there exists no standardised mechanism for:

(a) expressing, before execution, what an agent is intended and authorised to do;
(b) cryptographically binding that expression to the execution artefact;
(c) enforcing at runtime that the agent cannot exceed the boundaries of that expression;
(d) carrying that expression portably across hardware, network, and organisational boundaries.

The absence of this mechanism creates a class of problem this specification calls **semantic opacity**: the behaviour of AI agents is observable after the fact, but not auditable at the intent level.

UBVM/SCP introduces the Semantic Capsule as the mechanism for resolving semantic opacity. A capsule is a first-class artefact encoding declared intent, permitted operations, containment constraints, cryptographic provenance, and lineage. The UBVM runtime validates and enforces all of these before any operation is dispatched.

### 1.2 Scope

This specification covers:

- The Semantic Capsule format (encoding, required fields, optional fields, hash computation)
- Containment classes and their enforcement semantics
- The primitive dispatch table and primitive registration
- The UBVM runtime execution model (capsule ingestion, validation pipeline, dispatch, audit)
- Provenance validation, including hash chain traversal
- The event bus protocol
- Multi-node scoped execution and cross-node authorisation
- The audit log format
- Error codes and rejection record format
- Conformance requirements for implementations

This specification does not cover:

- The internal implementation of any specific AI model or inference engine
- Network transport protocols (TCP/IP, HTTP, etc.) used to transmit capsules between nodes
- Key management infrastructure (beyond specifying that signing keys MUST be operator-managed)
- Application-level integration APIs beyond the UBVM node interface

### 1.3 Relationship to Other Standards

UBVM/SCP is an independent protocol. Where it intersects with existing standards, those relationships are noted:

- Capsule hashing uses SHA-256 as specified in FIPS PUB 180-4
- Timestamps use ISO 8601 extended format
- Capsule encoding uses JSON as specified in RFC 8259
- UUID fields use UUID v4 as specified in RFC 4122

---

## 2. Design Goals

UBVM/SCP is designed to satisfy the following goals, in priority order:

**G1 — Sovereignty.** A conforming UBVM deployment MUST be operable without any external network dependency. No licence check-in, telemetry, update mechanism, or API call to a third-party service may be required for correct operation.

**G2 — Portability.** A conforming implementation MUST behave identically on any host architecture from which it can be built, including ARM Cortex-M series microcontrollers, ARM64 single-board computers, x86-64 servers, and cloud virtual machines.

**G3 — Verifiability.** Every capsule execution MUST produce an audit record. Every rejection MUST produce a rejection record. These records MUST be sufficient to independently reconstruct the full execution history of any capsule.

**G4 — Containment.** The runtime MUST enforce containment class restrictions. An operation not permitted by a capsule's containment class MUST be rejected before any system call, I/O operation, or primitive handler is invoked.

**G5 — Determinism.** Given the same capsule and the same primitive dispatch table, a conforming UBVM implementation MUST produce the same validation result. Validation is deterministic and stateless with respect to external services.

**G6 — Minimalism.** The runtime core — capsule ingestion, validation pipeline, primitive dispatch, and audit writing — SHOULD be implementable in under 2,000 lines of code in any general-purpose language. Complexity belongs in the application layer, not the runtime.

---

## 3. Terminology

**Semantic Capsule (Capsule):** A JSON-encoded artefact conforming to Section 5 of this specification, expressing the declared intent, containment constraints, permitted primitives, provenance hash, and lineage of a single AI agent operation.

**Node:** A running instance of the UBVM runtime, identified by a unique Node Scope Identifier, operating a specific containment class and primitive dispatch table.

**Node Scope Identifier (NSI):** A unique string identifier, set at node initialisation, that determines which capsules a node is authorised to execute. A capsule's `node_scope` field MUST match the executing node's NSI.

**Containment Class (CC):** An enumerated value (CC0 through CC5) specifying the set of primitive operations a capsule is permitted to invoke. Defined in Section 6.

**Primitive:** An atomic, named operation registered in a node's dispatch table. Capsules declare which primitives they require; the runtime validates these against the dispatch table and containment class before execution.

**Dispatch Table:** A runtime-local registry mapping primitive names to handler functions, each annotated with a minimum containment class requirement.

**Provenance Hash:** The SHA-256 hash of a capsule's canonical JSON representation, computed as specified in Section 9.1. Stored in the capsule's `provenance.sha256` field.

**Hash Chain:** The lineage of provenance hashes from a given capsule back to the root capsule of a lineage, linked by `provenance.parent_capsule_id` references.

**Audit Log:** An append-only record of all capsule execution events, rejection events, and node lifecycle events, formatted as specified in Section 12.

**Rejection Record:** A structured record created whenever a capsule fails validation, specifying the failure reason and the validation stage at which failure occurred.

**Operator:** A person or organisation that deploys and operates one or more UBVM nodes under the Meaning Sovereignty Licence v1.0.

**Author:** The person or system that created and signed a capsule. Identified by `author.id` and `author.name` in the capsule.

**Cross-Node Call:** An execution request that traverses from one node to another, governed by a `cross_node_auth` block requiring explicit authorisation.

**Event Bus:** A publish-subscribe message bus, scoped to a node or node group, over which capsule execution events are broadcast.

**Root Capsule:** A capsule with `provenance.parent_capsule_id` set to `null`, representing the origin of a capsule lineage.

**Sovereign Operation:** Operation of a UBVM node without any external network dependency.

---

## 4. System Architecture

### 4.1 Overview

A UBVM deployment consists of one or more **nodes**, each running an instance of the UBVM runtime. Each node maintains:

- A Node Scope Identifier (NSI)
- A containment class configuration (the maximum CC the node will execute)
- A primitive dispatch table
- An event bus connection
- An audit log writer

```
┌──────────────────────────────────────────────────────────────┐
│  UBVM NODE                                                    │
│                                                              │
│  ┌────────────────┐    ┌──────────────────────────────────┐  │
│  │  Capsule       │    │  Validation Pipeline             │  │
│  │  Ingestion     │───▶│  1. Schema validation            │  │
│  │  (file/stream/ │    │  2. Provenance hash verify       │  │
│  │   API/socket)  │    │  3. Node scope check             │  │
│  └────────────────┘    │  4. Containment class check      │  │
│                        │  5. Primitive registration check  │  │
│                        │  6. Expiry check                  │  │
│                        └──────────────┬───────────────────┘  │
│                                       │                       │
│                                  PASS │ FAIL                  │
│                                       │    │                  │
│                        ┌─────────────▼┐   ▼                  │
│                        │  Primitive   │  Rejection           │
│                        │  Dispatch    │  Record Writer       │
│                        └──────┬───────┘                      │
│                               │                              │
│                        ┌──────▼───────┐  ┌───────────────┐  │
│                        │  Primitive   │  │  Event Bus    │  │
│                        │  Handlers    │  │  Publisher    │  │
│                        └──────┬───────┘  └───────────────┘  │
│                               │                              │
│                        ┌──────▼───────┐                      │
│                        │  Audit Log   │                      │
│                        │  Writer      │                      │
│                        └──────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Multi-Node Topology

Multiple UBVM nodes may be deployed in a topology. Each node is independently scoped. Nodes communicate via the event bus. Cross-node capsule execution requires an explicit `cross_node_auth` block (see Section 11).

```
┌─────────────────┐     EVENT BUS      ┌─────────────────┐
│  NODE A         │◀──────────────────▶│  NODE B         │
│  NSI: analysis  │                    │  NSI: storage   │
│  CC: CC2        │───── cross_node ──▶│  CC: CC1        │
└─────────────────┘      capsule       └─────────────────┘
```

### 4.3 Runtime Lifecycle

1. **Initialisation** — Node reads configuration, initialises dispatch table, opens event bus connection, opens audit log
2. **Ready** — Node begins accepting capsules
3. **Execution** — For each capsule: validate → dispatch → audit
4. **Shutdown** — Node closes event bus, flushes and closes audit log, writes shutdown record

---

## 5. The Semantic Capsule — Format Specification

### 5.1 Encoding

A Semantic Capsule MUST be encoded as a valid JSON object (RFC 8259) with UTF-8 encoding. The file extension for a capsule file is `.scp.json`. A capsule transmitted over a stream or API endpoint MUST be a valid JSON object.

### 5.2 Required Fields

The following fields are REQUIRED in every capsule. A capsule missing any required field MUST be rejected at schema validation (Stage 1) with error code `SCHEMA_MISSING_FIELD`.

#### 5.2.1 `scp_version`
- **Type:** string
- **Value:** MUST be `"1.0"` for capsules conforming to this specification
- **Purpose:** Identifies the SCP version for parsing and validation

#### 5.2.2 `capsule_id`
- **Type:** string
- **Format:** UUID v4 (RFC 4122)
- **Purpose:** Globally unique capsule identifier

A runtime MUST reject a capsule whose `capsule_id` matches a capsule that has already been executed on that node within the current session, with error code `DUPLICATE_CAPSULE_ID`. This prevents replay attacks.

#### 5.2.3 `node_scope`
- **Type:** string
- **Purpose:** Declares which node NSI this capsule is authorised to execute on
- **Constraint:** MUST exactly match the executing node's NSI (see Section 4.1), or the capsule MUST contain a valid `cross_node_auth` block (see Section 11)

#### 5.2.4 `intent`
- **Type:** object
- **Required sub-fields:**
  - `declared` (string): A human-readable statement of what this capsule intends to do. MUST NOT be empty.
  - `category` (enum): One of: `ANALYSIS`, `GENERATION`, `EXECUTION`, `COMMUNICATION`, `MUTATION`, `CONTAINMENT`
  - `sensitivity` (enum): One of: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

The `declared` field is the canonical statement of intent. It is part of the hashed content and therefore tamper-evident. A UBVM runtime MAY surface this field to operators and auditors as the human-readable description of what a given capsule execution was intended to accomplish.

#### 5.2.5 `containment_class`
- **Type:** string
- **Value:** One of: `CC0`, `CC1`, `CC2`, `CC3`, `CC4`, `CC5`
- **Purpose:** Declares the containment class under which this capsule is authorised to execute (see Section 6)

#### 5.2.6 `author`
- **Type:** object
- **Required sub-fields:**
  - `id` (string): Operator identifier. Opaque to the runtime; meaningful to the audit log.
  - `name` (string): Human-readable operator name.

#### 5.2.7 `provenance`
- **Type:** object
- **Required sub-fields:**
  - `created_at` (string): ISO 8601 extended format timestamp of capsule creation
  - `sha256` (string): SHA-256 hash of this capsule's canonical representation (see Section 9.1)
  - `parent_capsule_id` (string | null): UUID of the parent capsule, or `null` if this is a root capsule

#### 5.2.8 `primitives`
- **Type:** array of strings
- **Purpose:** Declares the complete set of primitive names this capsule may invoke
- **Constraint:** MUST NOT be empty. Every string in this array MUST match a primitive registered in the node's dispatch table (see Section 7), or the capsule is rejected at Stage 5 with error `PRIMITIVE_NOT_REGISTERED`.

#### 5.2.9 `payload`
- **Type:** object
- **Purpose:** Capsule-specific data. Contents are defined by the primitive handlers invoked. MAY be an empty object `{}`.

### 5.3 Optional Fields

#### 5.3.1 `expiry`
- **Type:** string (ISO 8601)
- **Purpose:** If present, the capsule MUST be rejected after this timestamp with error `CAPSULE_EXPIRED`. The runtime MUST check expiry before executing the capsule.

#### 5.3.2 `metadata`
- **Type:** object
- **Purpose:** Operator-defined metadata. Not validated by the runtime. Not part of the provenance hash computation (see Section 9.1).

#### 5.3.3 `cross_node_auth`
- **Type:** object
- **Purpose:** Required when a capsule is executed on a node whose NSI does not match `node_scope` (see Section 11)

### 5.4 Capsule Example

```json
{
  "scp_version": "1.0",
  "capsule_id": "7f3a9b2c-1e4d-4f6a-8b0c-2d5e7f9a1b3c",
  "node_scope": "forge-analysis-01",
  "intent": {
    "declared": "Read the provided document and produce a structured summary with key claims identified",
    "category": "ANALYSIS",
    "sensitivity": "LOW"
  },
  "containment_class": "CC3",
  "author": {
    "id": "operator-001",
    "name": "Forge Theory Labs"
  },
  "provenance": {
    "created_at": "2025-05-11T09:00:00Z",
    "sha256": "a3f7b2c9d1e4f6a8b0c2d5e7f9a1b3c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4",
    "parent_capsule_id": null
  },
  "primitives": ["READ_DOCUMENT", "STRUCTURE_OUTPUT"],
  "payload": {
    "document": "base64-encoded-or-inline-text-content-here"
  }
}
```

---

## 6. Containment Classes

### 6.1 Definition

A containment class is a named permission tier. Every capsule declares a containment class. The UBVM runtime enforces that a capsule may only invoke primitives whose `min_class` is less than or equal to the capsule's declared containment class.

Containment classes are ordered: CC0 > CC1 > CC2 > CC3 > CC4 > CC5, where CC0 is most privileged and CC5 is most restricted.

### 6.2 Class Definitions

| Class | Name | Description |
|-------|------|-------------|
| CC0 | Sovereign | All primitives available. Reserved for operator-level administrative capsules. MUST NOT be used for external or untrusted capsules. |
| CC1 | Trusted | All registered primitives. Filesystem read/write permitted. Network access permitted. Cross-node calls permitted. |
| CC2 | Standard | All registered primitives except filesystem write to paths outside the designated output directory. No cross-node calls without explicit `cross_node_auth`. |
| CC3 | Restricted | Read-only primitives only. No filesystem write. No network access. No cross-node calls. |
| CC4 | Minimal | Output generation primitives only. No reads from system paths. No external calls of any kind. |
| CC5 | Contained | Single primitive execution. No state persistence between invocations. Every operation written to audit log before execution. |

### 6.3 Containment Enforcement

A runtime MUST enforce containment classes at the dispatch stage (after provenance validation and before primitive handler invocation). The enforcement check is:

```
if primitive.min_class_ordinal < capsule.containment_class_ordinal:
    REJECT with CONTAINMENT_VIOLATION
```

Where the ordinal mapping is: CC0=0, CC1=1, CC2=2, CC3=3, CC4=4, CC5=5, and a primitive with `min_class` CC2 has `min_class_ordinal` = 2.

A capsule with `containment_class: "CC3"` (ordinal 3) requesting a primitive with `min_class: "CC1"` (ordinal 1) MUST be rejected because 1 < 3.

### 6.4 Node Containment Cap

A node MAY be configured with a maximum containment class it will accept. A capsule declaring a containment class more privileged than the node's cap MUST be rejected with `NODE_CLASS_EXCEEDED`. This allows operator-designated analysis nodes to refuse sovereign or trusted capsules regardless of their content.

---

## 7. The Primitive Dispatch Table

### 7.1 Definition

The primitive dispatch table is a runtime-local registry mapping primitive names (strings) to:

- A handler function
- A minimum containment class (`min_class`)
- A description

The dispatch table is initialised at node startup and is immutable during a session. A runtime MUST NOT allow runtime modification of the dispatch table.

### 7.2 Core Primitives

The following primitives are REQUIRED in all conforming implementations:

| Primitive Name | Description | Min Class |
|---------------|-------------|-----------|
| `READ_TEXT` | Read a UTF-8 text string from `payload.text` | CC5 |
| `READ_DOCUMENT` | Parse a structured document (JSON, text, or base64) from `payload.document` | CC4 |
| `STRUCTURE_OUTPUT` | Format execution output according to `payload.output_schema` | CC5 |
| `EMIT_EVENT` | Publish an event to the node's event bus | CC4 |
| `VALIDATE_CAPSULE` | Validate a child capsule's provenance hash chain | CC3 |
| `LOG_AUDIT` | Write an operator-defined record to the audit log | CC3 |

The following primitives are RECOMMENDED and SHOULD be implemented in general-purpose deployments:

| Primitive Name | Description | Min Class |
|---------------|-------------|-----------|
| `GENERATE_TEXT` | Invoke the configured language model | CC2 |
| `WRITE_FILE` | Write to a designated output path | CC1 |
| `FETCH_URL` | HTTP GET to an allowlisted URL | CC1 |
| `SPAWN_CAPSULE` | Create and schedule a child capsule | CC2 |
| `CROSS_NODE_CALL` | Forward execution to another node | CC1 |

### 7.3 Custom Primitive Registration

Implementations MAY register custom primitives. A custom primitive registration MUST specify:

- A unique name (string, uppercase with underscores, not matching any core primitive name)
- A handler function
- A minimum containment class
- A human-readable description

A custom primitive name MUST NOT begin with the prefix `UBVM_` (reserved for future standard primitives).

---

## 8. The UBVM Runtime — Execution Model

### 8.1 Validation Pipeline

Every capsule submitted to a UBVM runtime MUST pass through the following validation stages, in order. A failure at any stage MUST result in immediate rejection; subsequent stages MUST NOT be evaluated.

**Stage 1 — Schema Validation**
Verify that the capsule is valid JSON, contains all required fields (Section 5.2), and that all typed fields match their declared types.

**Stage 2 — Provenance Hash Verification**
Compute the expected SHA-256 hash of the capsule's canonical representation (Section 9.1) and compare to `provenance.sha256`. If they do not match, reject with `PROVENANCE_INVALID`.

**Stage 3 — Node Scope Check**
Compare `node_scope` to the executing node's NSI. If they do not match, and no valid `cross_node_auth` block is present, reject with `SCOPE_MISMATCH`.

**Stage 4 — Containment Class Check**
Verify that the capsule's `containment_class` does not exceed the node's containment cap (Section 6.4). Verify that all primitives in `primitives[]` are permitted under the declared containment class (Section 6.3). Reject with `CONTAINMENT_VIOLATION` or `NODE_CLASS_EXCEEDED` as appropriate.

**Stage 5 — Primitive Registration Check**
Verify that every primitive in `primitives[]` is registered in the node's dispatch table. Reject with `PRIMITIVE_NOT_REGISTERED` if any are absent.

**Stage 6 — Expiry Check**
If `expiry` is present, verify that the current timestamp is before the expiry. Reject with `CAPSULE_EXPIRED` if not.

**Stage 7 — Duplicate Check**
Verify that `capsule_id` has not already been executed in this session. Reject with `DUPLICATE_CAPSULE_ID` if it has.

### 8.2 Execution

Upon passing all validation stages, the runtime:

1. Writes a `CAPSULE_ACCEPTED` audit record
2. Invokes each registered primitive in the order they appear in `primitives[]`
3. After all primitives complete, writes a `CAPSULE_EXECUTED` audit record with execution result
4. Publishes a `capsule.executed` event to the event bus

### 8.3 Error Handling

If a primitive handler raises an exception or returns an error, the runtime:

1. Halts further primitive invocations for this capsule
2. Writes a `CAPSULE_FAILED` audit record with the error detail
3. Publishes a `capsule.failed` event to the event bus

The runtime MUST NOT crash on capsule execution failure. It MUST continue accepting subsequent capsules.

---

## 9. Provenance Validation Algorithm

### 9.1 Canonical Hash Computation

The SHA-256 hash for a capsule is computed over the capsule's **canonical JSON representation**. The canonical representation is defined as:

1. Take the capsule JSON object
2. Remove the `provenance.sha256` field entirely
3. Remove the `metadata` field entirely (if present)
4. Serialise to JSON with:
   - Keys sorted lexicographically at every level
   - No whitespace (compact serialisation)
   - UTF-8 encoding
5. Compute SHA-256 of the resulting byte string
6. Encode as lowercase hexadecimal

This algorithm is deterministic. Any two implementations that correctly follow this algorithm will produce identical hashes for identical capsule content.

### 9.2 Reference Implementation

```javascript
const crypto = require('crypto');

function canonicalHash(capsule) {
  // Deep clone to avoid mutation
  const c = JSON.parse(JSON.stringify(capsule));
  
  // Remove fields excluded from hash
  delete c.provenance.sha256;
  delete c.metadata;
  
  // Recursive key sort
  const sortKeys = (obj) => {
    if (Array.isArray(obj)) return obj.map(sortKeys);
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).sort().reduce((acc, k) => {
        acc[k] = sortKeys(obj[k]);
        return acc;
      }, {});
    }
    return obj;
  };
  
  const sorted = sortKeys(c);
  const canonical = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
```

### 9.3 Hash Chain Validation

To validate the complete hash chain for a capsule:

1. Compute and verify the hash of the capsule itself (Section 9.1)
2. If `provenance.parent_capsule_id` is not null, retrieve the parent capsule
3. Verify the parent capsule's hash
4. Repeat recursively until a root capsule (`parent_capsule_id: null`) is reached
5. If any hash in the chain fails verification, the entire chain is invalid

A runtime MUST NOT execute a capsule whose hash chain contains any invalid link.

A runtime MAY cache verified hash chains for the duration of a session.

---

## 10. The Event Bus

### 10.1 Purpose

The UBVM event bus is a publish-subscribe channel over which the runtime broadcasts capsule lifecycle events. It enables external systems (dashboards, monitors, other nodes) to observe node activity without access to the audit log.

### 10.2 Standard Events

| Event Name | Trigger | Payload Fields |
|-----------|---------|----------------|
| `capsule.received` | Capsule ingested, before validation | `capsule_id`, `node_scope`, `timestamp` |
| `capsule.accepted` | Capsule passed all validation stages | `capsule_id`, `author.id`, `containment_class`, `timestamp` |
| `capsule.executed` | Capsule execution completed | `capsule_id`, `primitives`, `duration_ms`, `timestamp` |
| `capsule.failed` | Capsule execution failed mid-execution | `capsule_id`, `error_code`, `error_detail`, `timestamp` |
| `capsule.rejected` | Capsule failed validation | `capsule_id`, `stage`, `error_code`, `timestamp` |
| `node.started` | Node initialisation complete | `node_scope`, `containment_cap`, `primitive_count`, `timestamp` |
| `node.stopped` | Node shutdown | `node_scope`, `timestamp` |

### 10.3 Transport

The event bus transport is not specified by this protocol. Conforming implementations MAY use any pub-sub mechanism (Redis pub/sub, MQTT, Node.js EventEmitter, Unix socket, etc.) provided all standard events are emitted. In sovereign/air-gapped deployments, a local EventEmitter or in-process event channel is REQUIRED to be available as a fallback.

---

## 11. Multi-Node Architecture and Scoped Execution

### 11.1 Node Scope Isolation

Each node's NSI creates an execution boundary. By default, a capsule authored for node `A` MUST NOT execute on node `B`. This is enforced at Stage 3 of the validation pipeline.

### 11.2 Cross-Node Authorisation

A capsule MAY be authorised for cross-node execution by including a `cross_node_auth` block. This block MUST contain:

| Field | Type | Description |
|-------|------|-------------|
| `target_node_scope` | string | NSI of the target node |
| `authorised_by` | string | NSI of the authorising sovereign node |
| `auth_token` | string | Opaque token issued by the authorising node |
| `expires_at` | string (ISO 8601) | Expiry of the cross-node authorisation |

The receiving node MUST verify that:
1. `target_node_scope` matches its own NSI
2. `authorised_by` is a node it recognises as authoritative
3. `auth_token` is valid for the authorising node
4. The authorisation has not expired

The mechanism for issuing and verifying `auth_token` values is implementation-defined and SHOULD be documented in the deployment's operational specification.

---

## 12. The Audit Log

### 12.1 Properties

The audit log MUST be:

- **Append-only.** Existing records MUST NOT be modified or deleted.
- **Timestamped.** Every record MUST include an ISO 8601 timestamp with at minimum millisecond precision.
- **Structured.** Records MUST be serialisable to JSON.
- **Persisted.** The log MUST be written to durable storage before the runtime acknowledges capsule completion.

### 12.2 Record Format

Every audit log record is a JSON object with the following required fields:

| Field | Type | Description |
|-------|------|-------------|
| `record_id` | string (UUID v4) | Unique identifier for this audit record |
| `record_type` | enum | See 12.3 |
| `timestamp` | string (ISO 8601) | Time of record creation, millisecond precision |
| `node_scope` | string | NSI of the recording node |
| `capsule_id` | string / null | ID of the relevant capsule, or null for node lifecycle events |

Additional fields are defined per record type (Section 12.3).

### 12.3 Record Types

| Record Type | Additional Fields | Trigger |
|-------------|------------------|---------|
| `NODE_START` | `containment_cap`, `primitive_count`, `config_hash` | Node initialisation |
| `NODE_STOP` | `uptime_seconds`, `capsules_executed`, `capsules_rejected` | Node shutdown |
| `CAPSULE_RECEIVED` | `capsule_id`, `author_id`, `declared_intent` | Capsule ingested |
| `CAPSULE_ACCEPTED` | `capsule_id`, `containment_class`, `primitives` | All validation passed |
| `CAPSULE_EXECUTED` | `capsule_id`, `primitives`, `duration_ms`, `result_summary` | Execution complete |
| `CAPSULE_FAILED` | `capsule_id`, `error_code`, `error_detail`, `stage` | Execution error |
| `CAPSULE_REJECTED` | `capsule_id`, `error_code`, `stage`, `detail` | Validation failure |
| `CROSS_NODE_OUTBOUND` | `capsule_id`, `target_node_scope` | Cross-node call dispatched |
| `CROSS_NODE_INBOUND` | `capsule_id`, `source_node_scope` | Cross-node capsule received |

### 12.4 Example Audit Record

```json
{
  "record_id": "b2c4d6e8-f0a2-4b6c-8d0e-2f4a6b8c0d2e",
  "record_type": "CAPSULE_ACCEPTED",
  "timestamp": "2025-05-11T09:00:00.142Z",
  "node_scope": "forge-analysis-01",
  "capsule_id": "7f3a9b2c-1e4d-4f6a-8b0c-2d5e7f9a1b3c",
  "containment_class": "CC3",
  "primitives": ["READ_DOCUMENT", "STRUCTURE_OUTPUT"],
  "author_id": "operator-001"
}
```

---

## 13. Error Codes and Rejection Records

### 13.1 Error Codes

| Error Code | Stage | Description |
|-----------|-------|-------------|
| `SCHEMA_MISSING_FIELD` | 1 | Required field absent |
| `SCHEMA_TYPE_ERROR` | 1 | Field present but wrong type |
| `SCHEMA_INVALID_ENUM` | 1 | Enum field contains unlisted value |
| `PROVENANCE_INVALID` | 2 | Computed hash does not match `provenance.sha256` |
| `SCOPE_MISMATCH` | 3 | `node_scope` does not match executing node NSI |
| `CROSS_NODE_AUTH_INVALID` | 3 | `cross_node_auth` present but invalid |
| `CROSS_NODE_AUTH_EXPIRED` | 3 | `cross_node_auth` present but expired |
| `CONTAINMENT_VIOLATION` | 4 | Primitive requires higher privilege than declared CC |
| `NODE_CLASS_EXCEEDED` | 4 | Capsule CC more privileged than node cap |
| `PRIMITIVE_NOT_REGISTERED` | 5 | Named primitive not in dispatch table |
| `CAPSULE_EXPIRED` | 6 | Current time is after `expiry` |
| `DUPLICATE_CAPSULE_ID` | 7 | `capsule_id` already executed this session |
| `EXECUTION_ERROR` | — | Primitive handler raised an exception |
| `CHAIN_INVALID` | 2 | A hash in the provenance chain failed verification |

---

## 14. Test Vectors

The following test vectors MUST produce the stated result in any conforming implementation. They are provided to enable validation of the hash computation algorithm and validation pipeline.

### 14.1 Hash Computation Vector 1 — Minimal Capsule

**Input capsule (before hash computation):**
```json
{
  "scp_version": "1.0",
  "capsule_id": "00000000-0000-4000-8000-000000000001",
  "node_scope": "test-node",
  "intent": {
    "declared": "Test capsule",
    "category": "ANALYSIS",
    "sensitivity": "LOW"
  },
  "containment_class": "CC3",
  "author": {
    "id": "test-operator",
    "name": "Test"
  },
  "provenance": {
    "created_at": "2025-01-01T00:00:00Z",
    "sha256": "COMPUTE",
    "parent_capsule_id": null
  },
  "primitives": ["READ_TEXT"],
  "payload": {}
}
```

**Expected canonical JSON (keys sorted, compact, `sha256` and `metadata` removed):**
```
{"author":{"id":"test-operator","name":"Test"},"capsule_id":"00000000-0000-4000-8000-000000000001","containment_class":"CC3","intent":{"category":"ANALYSIS","declared":"Test capsule","sensitivity":"LOW"},"node_scope":"test-node","payload":{},"primitives":["READ_TEXT"],"provenance":{"created_at":"2025-01-01T00:00:00Z","parent_capsule_id":null},"scp_version":"1.0"}
```

**Expected SHA-256:**
```
cf22950338429a21d8a360a3daa45ab23580868962c7aaa075319b0d0b1436ff
```

This value was computed by the reference implementation (`ubvm.js`) and confirmed by the test vector suite (12/12 passing). Any conforming implementation MUST produce this exact value for the input above.

### 14.2 Validation Pipeline Vectors

| Vector | Input | Expected Result | Expected Error |
|--------|-------|-----------------|----------------|
| V-01 | Valid CC3 capsule with READ_TEXT | CAPSULE_ACCEPTED | — |
| V-02 | Valid capsule with tampered `declared` field | REJECTED at Stage 2 | PROVENANCE_INVALID |
| V-03 | Valid capsule with wrong `node_scope` | REJECTED at Stage 3 | SCOPE_MISMATCH |
| V-04 | CC3 capsule requesting CC1 primitive WRITE_FILE | REJECTED at Stage 4 | CONTAINMENT_VIOLATION |
| V-05 | Capsule requesting unregistered primitive FOO | REJECTED at Stage 5 | PRIMITIVE_NOT_REGISTERED |
| V-06 | Capsule with `expiry` in the past | REJECTED at Stage 6 | CAPSULE_EXPIRED |
| V-07 | Duplicate `capsule_id` submitted twice | Second: REJECTED at Stage 7 | DUPLICATE_CAPSULE_ID |

---

## 15. Conformance Requirements

### 15.1 Conforming Implementation

An implementation is **conforming** if and only if it:

1. Implements the capsule validation pipeline (Section 8.1) in full, in order, and rejects on any failure
2. Implements provenance hash computation exactly as specified in Section 9.1
3. Enforces all containment class restrictions (Section 6.3)
4. Implements all six core primitives (Section 7.2)
5. Writes all required audit record types (Section 12.3)
6. Produces correct results for all test vectors in Section 14
7. Operates correctly in sovereign mode (no external dependencies required)

### 15.2 Partial Conformance

An implementation that satisfies requirements 1, 2, 3, and 7 but omits optional primitives or audit fields MAY describe itself as **partially conforming** and MUST document which requirements it satisfies.

### 15.3 Conformance Claims

An implementation MUST NOT claim to be "UBVM/SCP conforming" unless it passes all requirements in Section 15.1. Implementations that have not been validated against the test vectors in Section 14 MUST NOT make conformance claims.

---

## 16. Security Considerations

### 16.1 Hash Collision

SHA-256 is used for provenance hashing. While no practical collision attacks against SHA-256 are known as of the date of this specification, operators deploying UBVM in high-assurance environments SHOULD plan for migration to SHA-3 or another algorithm in a future specification version.

### 16.2 Replay Attacks

The `capsule_id` duplicate check (Stage 7) prevents replay attacks within a session. Across sessions, operators SHOULD maintain a persistent executed-capsule store if replay prevention across restarts is required.

### 16.3 Cross-Node Auth Token Security

The `auth_token` mechanism in cross-node authorisation (Section 11.2) is implementation-defined. Operators MUST ensure that tokens are issued by authoritative nodes, are time-limited (see `expires_at`), and are single-use or scope-limited. Tokens SHOULD be signed JWTs or equivalent cryptographic artefacts.

### 16.4 Audit Log Integrity

The audit log is append-only by specification. Implementations in high-assurance environments SHOULD additionally protect log integrity using a hash-chain over log entries, or by writing to a write-once storage medium.

### 16.5 Sovereign Operation

Sovereign operation (G1) requires that no runtime component make network calls to external services. Operators MUST audit their deployment to verify that no library dependency, telemetry agent, or primitive handler violates this requirement.

### 16.6 Key Management

This specification does not define key management for operators or authors. Deployments using cryptographic signing of capsules (beyond the hash chain) SHOULD follow NIST SP 800-57 or equivalent guidelines.

---

## 17. Intellectual Property Notice

UBVM and SCP are original works created by James [Surname], trading as Giblets Creations and Forge Theory Labs, England. Both works are protected under the Copyright, Designs and Patents Act 1988.

The Meaning Sovereignty Licence v1.0 governs use, deployment, and modification of UBVM and SCP. See `LICENCE.md` in the reference implementation repository.

"UBVM", "Universal Behavioural Virtual Machine", "Semantic Capsule Protocol", "SCP", "Meaning Sovereignty Licence", and "Forge Theory Labs" are used as trade identifiers by James [Surname] / Giblets Creations. Unauthorised use of these identifiers in the context of AI execution runtimes or capsule-based AI protocols is not permitted.

Patent assessment is in progress. Pending patent claims may apply to methods described in this specification.

---

*UBVM/SCP Technical Specification v1.0*
*© 2025 James [Surname] · Forge Theory Labs · Giblets Creations · England*
*Document Ref: UBVM-SPEC-001 · Published May 2025*
