# SCP — Semantic Capsule Protocol
**Version:** 0.1 (Spec Draft)  
**Author:** James / Giblets Creations  
**Role:** Semantic and transport layer for UBVM capsules  
**Supported `scp_version`:** `0.1`

---

## 1. Purpose

SCP is the semantic and transport layer of the UBVM ecosystem.

Where UBVM defines *how* a capsule executes, SCP defines *what* a capsule means — its intent, its containment philosophy, its identity, and how it travels between systems and across AI agents.

SCP exists to solve a specific problem: **Digital Schizophrenia** — the loss of meaning that occurs when the same concept is described differently across tools, sessions, models, and systems. A capsule written once, to the SCP standard, means the same thing everywhere it is read.

SCP has two layers:

- **Semantic layer** — what a capsule means, how it is interpreted, what guarantees it carries
- **Transport layer** — how a capsule travels between nodes, systems, and AI agents

Both layers are defined in this document.

---

## 2. Meaning Sovereignty

The foundational principle of SCP is **Meaning Sovereignty**: the author of a capsule owns its meaning. No system, agent, or runtime may alter the declared intent of a capsule without explicit versioning.

This principle has three consequences:

1. **Immutability of core fields** — `intent`, `scp_id`, `object_class`, and `containment` are immutable after write. A system that modifies these fields is not SCP-compliant.
2. **Interpretation fidelity** — any system reading a capsule must interpret it according to the fields as written, not according to inference, assumption, or context collapse.
3. **Provenance** — every capsule carries its origin. Capsules derived from other capsules declare their lineage.

---

## 3. Capsule Identity

Every SCP capsule has a unique, stable identity.

### 3.1 `scp_id`

Format: `namespace/capsule-slug`

- `namespace` — the owning system, project, or author identifier (e.g. `ubvm`, `legion`, `budai`, `giblets`)
- `capsule-slug` — a lowercase, hyphenated descriptor of the capsule's role (e.g. `market-watcher`, `strategy-selector`)

Examples:
```
ubvm/sentinel-one
legion/strategy-selector
giblets/qi-jade-beast
budai/memory-core
```

`scp_id` is immutable after write. A capsule with a different `scp_id` is a different capsule.

### 3.2 `scp_version`

The version of the SCP protocol this capsule conforms to. Currently `"0.1"`.

A capsule's `scp_version` is separate from the version of the capsule itself. Capsule versioning is managed via `provenance.version` (see §6).

---

## 4. Semantic Layer

### 4.1 Required Semantic Fields

Every SCP capsule must declare the following fields. These are the meaning-bearing fields of the capsule.

| Field | Type | Immutable | Description |
|-------|------|-----------|-------------|
| `scp_version` | string | yes | SCP protocol version |
| `scp_id` | string | yes | Unique capsule identity |
| `object_class` | string | yes | Risk and containment classification |
| `intent` | string | yes | Single sentence. What this capsule does and why. |
| `containment` | object | yes | Declared safety constraints |

### 4.2 `intent`

The `intent` field is the semantic heart of the capsule. It must:

- Be a single sentence
- State what the capsule does and why it exists
- Be written for a human reader, not a machine parser
- Not reference implementation details

**Valid:**
```
"intent": "Fetch live OHLCV data from Binance every 5 minutes and emit a market update event."
```

**Invalid:**
```
"intent": "Calls http_request with Binance URL and appends to CSV."
```

The second example describes implementation, not intent. It would break if the implementation changed. The first example would not.

### 4.3 `object_class`

Declares the capsule's risk level and containment requirements. Four values are defined:

| Class | Meaning | Typical Use |
|-------|---------|-------------|
| `Safe` | Low risk. Predictable behaviour. Runs freely. | Data fetchers, loggers, renderers |
| `Euclid` | Moderate complexity. Behaviour is understood but requires monitoring. | Strategy selectors, validators |
| `Keter` | High risk or unpredictable output. Requires explicit containment. | LLM-driven generators, mutators |
| `Thaumiel` | System-level. Governs other capsules. | Orchestrators, auditors, kill switches |

Object class is assigned by the capsule author and is advisory to UBVM. Higher-level systems (e.g. LEGION) may enforce policy based on this value.

A Thaumiel capsule may emit events that trigger other capsules. No other class should do this by design.

### 4.4 `containment`

Declares the author's intent for how the capsule should be handled by the runtime.

```json
"containment": {
  "read_only":   false,
  "audit_log":   true,
  "kill_switch": false
}
```

| Field | Type | Meaning |
|-------|------|---------|
| `read_only` | boolean | Capsule should not write state to disk or external systems |
| `audit_log` | boolean | All actions taken by this capsule should be logged |
| `kill_switch` | boolean | This capsule can be halted by a stop signal |

These fields are advisory in UBVM Core. Enforcement is the responsibility of the runtime or a higher-level system.

---

## 5. Interpretation Block

The `interpretation` block is an optional but powerful SCP extension. It provides machine-readable authoring instructions that guide how any AI agent or system should read, generate, or act on the capsule's content.

```json
"interpretation": {
  "this_is":     "A human-readable description of what this capsule represents.",
  "purpose":     ["List of authoring goals"],
  "tone":        "Technical | Narrative | Instructional | Philosophical",
  "audience":    ["List of intended readers"],
  "importance":  ["Topics that must be covered"],
  "ignore":      ["Topics to exclude"],
  "dont_change": ["Fields or concepts that must not be altered by any system"]
}
```

### 5.1 `dont_change`

The `dont_change` array is a Meaning Sovereignty directive. Any system — human, AI, or automated — that reads this capsule must treat the listed items as immutable. This includes:

- AI agents generating content from the capsule
- Automated systems transforming or transporting the capsule
- Developers editing the capsule over time

Violation of a `dont_change` directive produces a semantically invalid capsule.

### 5.2 Interpretation Fidelity Rules

A system reading an SCP capsule with an `interpretation` block must:

1. Read all fields before acting
2. Respect `dont_change` as a hard constraint
3. Treat `ignore` as an exclusion list — listed topics must not appear in any output derived from this capsule
4. Cover all items in `importance` in any derived output
5. Match `tone` in any generated content
6. Not infer intent beyond what is declared in `intent` and `purpose`

---

## 6. Provenance

Every capsule carries its origin. Provenance fields are immutable after write.

```json
"provenance": {
  "author":       "James / Giblets Creations",
  "agent":        "Claude Sonnet 4.6",
  "created_at":   "2026-05-05T08:00:00Z",
  "version":      "1.0.0",
  "context":      "Created during UBVM documentation session, May 2026.",
  "capture_mode": "conversation | journal | voice | artifact | agent_generated | manual",
  "source_ref":   "claude.ai/chat/...",
  "lineage":      []
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `author` | yes | Human author identifier |
| `agent` | no | AI agent that assisted in creation |
| `created_at` | yes | ISO 8601 UTC timestamp. Immutable. |
| `version` | no | Capsule version (semver). Distinct from `scp_version`. |
| `context` | yes | Free-text description of the creation context |
| `capture_mode` | yes | How the capsule was originally created |
| `source_ref` | no | Reference to the source conversation or document |
| `lineage` | no | Ordered list of `scp_id` values this capsule was derived from |

### 6.1 Lineage

When a capsule is derived from another — through mutation, specialisation, or transformation — it must declare its lineage.

```json
"lineage": ["legion/strategy-base", "legion/sma-crossover-v1"]
```

Lineage is ordered from most distant ancestor to immediate parent. A runtime or auditing system can reconstruct the full derivation chain from this field.

---

## 7. Transport Layer

The transport layer defines how capsules travel between nodes, systems, and AI agents.

### 7.1 Capsule as the Unit of Transport

An SCP capsule is the unit of transport. Capsules are transported as UTF-8 encoded JSON. No binary encoding is defined in SCP 0.1.

### 7.2 Transport Envelope

When a capsule is transported between systems, it is wrapped in a transport envelope:

```json
{
  "scp_transport": "0.1",
  "sent_at":       "2026-05-05T08:00:00Z",
  "source_node":   "ubvm/node-s24-ultra",
  "target_node":   "ubvm/node-hetzner-vps",
  "capsule":       { ... }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `scp_transport` | yes | Transport protocol version |
| `sent_at` | yes | ISO 8601 UTC timestamp of transmission |
| `source_node` | yes | Identifier of the sending UBVM node |
| `target_node` | yes | Identifier of the receiving UBVM node |
| `capsule` | yes | The full capsule JSON object |

### 7.3 Node Identity

A UBVM node is identified by a string in the format `ubvm/node-<slug>`.

Examples:
```
ubvm/node-s24-ultra
ubvm/node-hetzner-vps
ubvm/node-local-dev
```

Node identifiers are assigned by the operator. They must be unique within a cluster.

### 7.4 Transport Rules

1. A receiving node must validate the capsule against its supported `scp_version` before executing it.
2. A receiving node must not modify capsule fields during or after transport.
3. If a capsule cannot be executed (unsupported version, invalid schema), the receiving node must log the rejection and return an error — it must not silently drop the capsule.
4. Transport is one-way. SCP 0.1 does not define a request-response transport pattern. Results are communicated via the event bus.

### 7.5 Transport Methods

SCP 0.1 defines two transport methods:

**File drop** — the capsule JSON is written to a shared directory monitored by the receiving node. Used for local or NFS-mounted node clusters.

**HTTP POST** — the transport envelope is POSTed to a receiving node's HTTP endpoint. Used for remote nodes (e.g. Hetzner VPS). The endpoint path is `POST /scp/receive`.

The receiving node responds with:

```json
{
  "status":   "accepted | rejected",
  "scp_id":   "namespace/capsule-slug",
  "reason":   "Optional rejection reason"
}
```

---

## 8. Cross-AI Consistency Rules

SCP capsules are designed to be read and acted upon by multiple AI systems — Claude, Gemini, local models, future agents. These rules ensure that the same capsule produces consistent interpretation across different AI agents.

### 8.1 The Consistency Contract

Any AI agent reading an SCP capsule must honour the following contract:

1. **Read before inferring.** The agent must read all declared fields before forming any interpretation. It must not infer intent from the capsule's structure, filename, or context alone.

2. **`intent` is authoritative.** The `intent` field is the ground truth of what the capsule does. The agent must not contradict, reframe, or expand it without explicit instruction.

3. **`dont_change` is a hard constraint.** If an `interpretation` block is present, `dont_change` items must be treated as immutable by the agent. The agent must not rephrase, reframe, or reinterpret listed items in any output it produces from this capsule.

4. **`ignore` is an exclusion directive.** The agent must not introduce content listed in `ignore` into any output derived from the capsule. This applies even if the agent believes the excluded content is relevant.

5. **Tone fidelity.** If `tone` is declared, the agent must match it in any generated output. An agent must not default to its own preferred register.

6. **No hallucinated fields.** The agent must not assume the existence of fields not present in the capsule. If a field is absent, the agent must treat it as undeclared — not as null, not as a default value.

7. **Lineage transparency.** If an agent generates a new capsule derived from an existing one, it must populate the `lineage` field with the parent capsule's `scp_id`.

### 8.2 Conflict Resolution

When two AI agents produce conflicting interpretations of the same capsule, the conflict is resolved in this order of precedence:

1. `dont_change` directives — always win
2. `intent` field — authoritative on purpose
3. `importance` list — determines scope
4. `ignore` list — determines exclusions
5. Agent inference — lowest precedence

An agent must never use its own inference to override a declared field.

### 8.3 Multi-Agent Pipelines

When a capsule passes through multiple AI agents in sequence (e.g. generator → validator → selector), each agent must:

1. Receive the full capsule, not a summary
2. Apply the consistency contract independently
3. Not carry forward interpretations from a previous agent unless explicitly declared in a `context` or `payload` field

The capsule is the shared memory of the pipeline. Each agent reads from it directly.

### 8.4 Forbidden Agent Behaviours

An AI agent reading an SCP capsule must not:

- Rewrite `intent` to match its own understanding
- Add undeclared fields to a capsule it is transporting or transforming
- Remove fields from a capsule it is passing to another system
- Summarise a capsule in a way that loses declared constraints
- Treat a capsule as a prompt template — it is a semantic artefact, not a string

---

## 9. Compliance Requirements

A system may claim SCP compliance only if it satisfies all requirements below.

### 9.1 Semantic Compliance

A compliant system must:

- Preserve all immutable fields (`scp_id`, `scp_version`, `object_class`, `intent`, `containment`, `provenance`) without modification
- Reject capsules with missing required fields
- Reject capsules with unsupported `scp_version` values
- Honour `dont_change` directives in any output derived from the capsule
- Populate `lineage` when deriving a new capsule from an existing one

### 9.2 Transport Compliance

A compliant node must:

- Wrap outgoing capsules in the transport envelope (§7.2)
- Validate incoming capsules before execution
- Never modify capsule fields during transport
- Reject and log invalid capsules — never silently drop them
- Respond to HTTP transport with the defined response format

### 9.3 Cross-AI Compliance

A compliant AI agent must:

- Apply all eight consistency rules (§8.1)
- Never override declared fields with inference
- Populate lineage on derived capsules
- Receive and act on the full capsule — not a summary

---

## 10. Known Gaps (SCP 0.1)

These are open items, tracked as first-class facts.

| Gap | Notes |
|-----|-------|
| Trust score system | Field present in capsules as `"trust_score": "reserved"`; formal scoring model deferred to SCP 0.2 |
| Capsule signing / integrity verification | No cryptographic signature defined in 0.1 |
| Binary transport encoding | UTF-8 JSON only in 0.1 |
| Request-response transport | One-way only in 0.1; bidirectional deferred |
| Cluster discovery protocol | Node identity defined; discovery mechanism deferred to UBVM 2.0 |
| Formal AI compliance certification | Rules defined (§8); certification process deferred |

---

## 11. Versioning Policy

SCP follows the same semantic versioning model as UBVM: `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking changes to capsule schema, transport envelope, or consistency rules
- **MINOR** — new optional fields, new transport methods, extended consistency rules
- **PATCH** — clarifications, error handling improvements, no schema changes

SCP version and UBVM version are independent. A UBVM 1.0 runtime may implement SCP 0.2. Both must declare their supported versions explicitly.

---

## 12. Reference Capsule (Full SCP Fields)

```json
{
  "scp_version":  "0.1",
  "scp_id":       "ubvm/example-full",
  "object_class": "Safe",
  "intent":       "Demonstrate a fully-specified SCP capsule with all semantic and provenance fields.",
  "containment": {
    "read_only":   false,
    "audit_log":   true,
    "kill_switch": false
  },
  "interpretation": {
    "this_is":     "A reference capsule showing all SCP 0.1 fields.",
    "purpose":     ["Serve as a canonical example for capsule authors"],
    "tone":        "Technical",
    "audience":    ["Capsule authors", "AI agents", "Runtime implementors"],
    "importance":  ["All SCP fields", "Provenance", "Interpretation block"],
    "ignore":      ["UBVM-specific implementation details"],
    "dont_change": ["scp_id", "intent", "object_class"]
  },
  "provenance": {
    "author":       "James / Giblets Creations",
    "agent":        "Claude Sonnet 4.6",
    "created_at":   "2026-05-05T08:00:00Z",
    "version":      "1.0.0",
    "context":      "Created as part of the SCP 0.1 specification document.",
    "capture_mode": "manual",
    "source_ref":   "",
    "lineage":      []
  },
  "behaviours": [
    {
      "trigger": "on_load",
      "actions": [
        { "primitive": "log",           "params": { "message": "Full SCP reference capsule loaded." } },
        { "primitive": "validate_self", "params": {} }
      ]
    }
  ]
}
```

---

## 13. Relationship to UBVM

| Layer | System | Responsibility |
|-------|--------|----------------|
| Semantic | SCP | What a capsule means, its identity, provenance, interpretation rules |
| Execution | UBVM | How a capsule runs, trigger evaluation, primitive dispatch, result handling |
| Transport | SCP | How a capsule travels between nodes and AI agents |
| Enforcement | LEGION / higher systems | Policy enforcement based on object class and containment |

SCP and UBVM are complementary, not redundant. A capsule can carry full SCP semantics and be executed by a UBVM runtime. Removing either layer reduces the system — UBVM without SCP is an executor without meaning; SCP without UBVM is meaning without execution.

---

*SCP is the language of intent. UBVM is the engine of action. Together they are the kernel of Forge Theory.*

*"I wanted it. So I forged it. Now forge yours."*
