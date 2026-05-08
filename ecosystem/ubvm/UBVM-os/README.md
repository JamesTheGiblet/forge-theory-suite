# UBVM — Universal Behavioural Virtual Machine

**Author:** James / Giblets Creations  
**Role:** Reference runtime for SCP (Semantic Capsule Protocol) capsules  
**Version:** 0.2  

---

## What UBVM Is

UBVM is a JSON-driven behavioural virtual machine. It executes **capsules** — self-contained declarative artefacts that describe what a system should do, when it should do it, and how.

UBVM is the reference runtime for SCP. Any system that "supports SCP" is, in effect, implementing the UBVM interpreter contract.

Every behaviour in a UBVM system is either:

- A **capsule** — a JSON file that declares intent, triggers, and actions
- A **primitive** — a registered Python function that performs a single atomic operation

No logic lives outside these two constructs. That is the design.

---

## Core Concepts

### Capsule

The atomic unit of execution in UBVM and the atomic unit of meaning in SCP.

A capsule declares:
- what it *is* (`scp_id`, `object_class`, `intent`)
- how it is *contained* (`containment`)
- when it *runs* (`trigger`)
- what it *does* (`actions` — ordered primitive calls)

```json
{
  "scp_version":  "0.1",
  "scp_id":       "ubvm/example",
  "object_class": "Safe",
  "intent":       "Fetch market data and emit an update event.",
  "containment":  { "read_only": false, "audit_log": true, "kill_switch": false },
  "behaviours": [
    {
      "trigger": "cron",
      "schedule": "*/5 * * * *",
      "actions": [
        { "primitive": "http_request", "params": { "url": "https://api.example.com/data" } },
        { "primitive": "emit_event",   "params": { "event": "market.data.updated" } }
      ]
    }
  ]
}
```

### Primitive

The only place executable logic lives. A primitive is a Python function registered in the DISPATCH table. Capsules call primitives; primitives do the work.

```python
def primitive_log(params: dict, context: dict) -> dict:
    print(params["message"])
    return {"status": "ok", "logged": params["message"]}

DISPATCH = {
    "log": primitive_log,
    # ...
}
```

### Interpreter

The UBVM component that loads a capsule, validates it, evaluates which triggers are active, dispatches primitives in order, and returns a structured result object. It is the behavioural equivalent of a VM instruction executor.

### Trigger

The condition that determines when a capsule runs. UBVM supports three:

| Trigger | When it fires |
|---------|--------------|
| `on_load` | Once, when `ubvm boot` is called |
| `cron` | On a defined schedule (standard cron syntax) |
| `on_event` | When a named event arrives on the event bus |

### Event Bus

Inter-capsule communication is file-based and append-only. When a capsule emits an event, it is written to `logs/events/queue.jsonl`. The scheduler daemon tails this file, matches events to listening capsules, and triggers the interpreter for each match.

This makes the system debuggable, restart-safe, and dependency-free.

---

## Mental Model

```
                    ┌─────────────┐
                    │  Scheduler  │  ← cron clock + event queue tail
                    └──────┬──────┘
                           │ trigger fires
                    ┌──────▼──────┐
                    │ Interpreter │  ← validates capsule, resolves triggers
                    └──────┬──────┘
                           │ for each action
              ┌────────────▼────────────┐
              │        DISPATCH         │  ← maps name → function
              └────────────┬────────────┘
                           │
          ┌────────────────▼────────────────┐
          │           Primitive             │  ← does the work
          │   primitive_name(params, ctx)   │
          └────────────────┬────────────────┘
                           │ returns result dict
                    ┌──────▼──────┐
                    │   Result    │  ← status, results[], errors[], events[]
                    └─────────────┘
```

One capsule emits an event. That event fires another capsule. That capsule emits another event. This is how autonomous pipelines are built — chains of capsules communicating through the event bus, each doing one thing well.

---

## Object Classes

Every capsule is assigned an object class that declares its risk level and containment requirements.

| Class | Meaning |
|-------|---------|
| `Safe` | Low risk. Runs freely. |
| `Euclid` | Moderate complexity. Monitored. |
| `Keter` | High risk or unpredictable. Requires explicit controls. |
| `Thaumiel` | System-level. Governs other capsules. |

UBVM treats these as advisory metadata. Higher-level systems may enforce policy based on class.

---

## UBVM and SCP

UBVM is the runtime. SCP (Semantic Capsule Protocol) is the semantic layer.

SCP defines what a capsule *means* — its intent, its containment philosophy, its trust properties, how it travels between systems. UBVM defines how a capsule *executes*.

A capsule written to the SCP standard and run on a UBVM-compliant interpreter is portable. That is the contract.

---

## UBVM and Forge Theory

UBVM is the kernel of the Forge Theory ecosystem. Every major system — LEGION, BuddAI, Data Cube, Data Cube — is or will be expressed as a UBVM organism: a cluster of capsules communicating through the event bus, governed by SCP, running on one or more UBVM nodes.

The ecosystem is designed to run on a single phone. It is also designed to scale to distributed nodes. The capsule model does not change between the two.

---

## Quick Start

```bash
# Run a capsule once
ubvm run capsules/sentinel_one.scp.json

# Boot all on_load capsules
ubvm boot

# Start the scheduler (cron + event daemon)
ubvm schedule

# Run the compliance test suite
ubvm test

# Print version
ubvm version
```

Set `UBC_ALLOW_EXEC=1` to enable the `exec` primitive.

---

## Documentation Suite

| Document | Purpose |
|----------|---------|
| `UBVM_SPEC.md` | Full specification — schema, contract, compliance, test suite |
| `UBVM_GLOSSARY.md` | Canonical definitions for all core terms |
| `UBVM_ROADMAP.md` | Phase-gated build plan from v0.2 to UBVM 3.0 |
| `SCP_SPEC.md` | Semantic and transport layer — meaning sovereignty, cross-AI rules |
| `capsules/` | Self-describing capsule suite — ubvm/core-identity, ubvm/spec, ubvm/glossary, ubvm/roadmap, scp/spec |

---

*UBVM is part of the Forge Theory ecosystem. The capsule is the unit of meaning. The interpreter is the unit of trust. The event bus is the nervous system.*

*"I wanted it. So I forged it. Now forge yours."*
<p align="center">
  <img src="https://img.shields.io/badge/Forge‑Theory‑Labs‑Ecosystem-black" />
  <img src="https://img.shields.io/badge/Semantic‑System‑typed-blue" />
  <img src="https://img.shields.io/badge/SCP‑Capsule‑included-purple" />
</p>

