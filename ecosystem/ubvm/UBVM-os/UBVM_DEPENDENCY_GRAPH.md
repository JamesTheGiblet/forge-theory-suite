# UBVM — Semantic Dependency Graph

**Version:** 1.0  
**Author:** James / Giblets Creations  
**Date:** May 2026

---

## Overview

This graph shows the dependency and governance relationships across the UBVM/SCP ecosystem. Read top-to-bottom: upstream nodes govern or constrain downstream nodes. Every arrow represents a dependency — the downstream node cannot be built, interpreted, or trusted without the upstream node being correct.

---

## Dependency Graph

```diagram

                          ┌──────────────────────────┐
                          │        scp/spec          │
                          │      (Semantic Law)      │
                          └───────────┬──────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     UBVM Semantic Layer (Upstream)                   │
└──────────────────────────────────────────────────────────────────────┘
         ▲                     ▲                        ▲
         │                     │                        │
         │                     │                        │
 ┌───────┴────────┐   ┌───────┴────────┐     ┌────────┴────────┐
 │ ubvm/core-id   │   │ ubvm/glossary  │     │  ubvm/roadmap   │
 │  (identity)    │   │  (vocabulary)  │     │  (governance)   │
 └───────┬────────┘   └───────┬────────┘     └────────┬────────┘
         │                    │                        │
         └─────────────┬──────┴──────────────┬─────────┘
                       ▼                      ▼
               ┌────────────────────────────────────┐
               │             ubvm/spec              │
               │          (Execution Law)           │
               └──────────────────┬─────────────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │     UBVM Runtime     │
                       └──────────┬───────────┘
                                  │ executes
                                  ▼
                       ┌──────────────────────┐
                       │   Capsules (.scp)    │
                       └──────────────────────┘
```

---

## Node Definitions

| Node | Type | Role |
|------|------|------|

| `scp/spec` | Semantic Law | Root of the entire graph. Defines Meaning Sovereignty, immutable fields, interpretation fidelity, transport, and cross-AI consistency rules. Nothing is valid without it. |
| `ubvm/core-identity` | Identity | Defines what UBVM is and how it should be understood. Governs the conceptual surface that `ubvm/spec` inherits. |
| `ubvm/glossary` | Vocabulary | Provides canonical term definitions consumed by all other nodes. Supports but does not govern — it anchors language, not law. |
| `ubvm/roadmap` | Governance | Defines phase gates and sequencing rules. Governs `ubvm/spec` by determining when 1.0 is cut. |
| `ubvm/spec` | Execution Law | Defines the interpreter contract, primitive model, event bus, compliance suite, and versioning policy. Governs the runtime. |
| `ubvm_runtime` | Runtime | The Python implementation (`interpreter.py`, `scheduler_daemon.py`, `boot.py`, CLI). Executes capsules. |
| `capsules` | Behavioural Units | The leaf of the graph. All logic lives here, expressed as `.scp.json` artefacts. Depends on everything above it. |

---

## Relationship Types

| Arrow | Meaning |
|-------|---------|

| `governs` | The upstream node defines rules the downstream node must obey. Violations produce non-compliance. |
| `supports` | The upstream node provides vocabulary or context that the downstream node relies on, without imposing hard rules. |
| `executes` | The runtime interprets and runs the capsule's declared behaviours. |

---

## Key Properties

**`scp/spec` is the true root.**  
Every node either depends on it directly or depends on a node that does. Meaning Sovereignty is the foundational axiom of the entire system.

**`ubvm/glossary` is the only pure support node.**  
It governs nothing. It anchors language across the suite — vocabulary should support, not rule.

**`capsules` is the only leaf.**  
Everything flows toward capsules. They are where the system expresses itself at runtime.

**`ubvm/roadmap` governs `ubvm/spec`.**  
This is a deliberate design choice — the phase gates in the roadmap are law for when the spec reaches 1.0. A roadmap change can move the 1.0 gate. Keep this relationship tight.

---

## Encoded as JSON

```json
{
  "nodes": {
    "scp/spec":          { "type": "semantic_law",     "governs": ["ubvm/core-identity", "ubvm/glossary", "ubvm/roadmap", "ubvm/spec", "capsules"] },
    "ubvm/core-identity": { "type": "identity",         "depends_on": ["scp/spec"], "governs": ["ubvm/spec"] },
    "ubvm/glossary":     { "type": "vocabulary",        "depends_on": ["scp/spec"], "supports": ["ubvm/core-identity", "ubvm/spec", "ubvm/roadmap", "capsules"] },
    "ubvm/roadmap":      { "type": "governance",        "depends_on": ["scp/spec"], "governs": ["ubvm/spec"] },
    "ubvm/spec":         { "type": "execution_law",     "depends_on": ["scp/spec", "ubvm/core-identity", "ubvm/glossary", "ubvm/roadmap"], "governs": ["ubvm_runtime", "capsules"] },
    "ubvm_runtime":      { "type": "runtime",           "depends_on": ["ubvm/spec"], "executes": ["capsules"] },
    "capsules":          { "type": "behavioural_units", "depends_on": ["scp/spec", "ubvm/spec", "ubvm/glossary", "ubvm_runtime"] }
  }
}
```

---

## Forge Yours

> *"I wanted it. So I forged it. Now forge yours."*
