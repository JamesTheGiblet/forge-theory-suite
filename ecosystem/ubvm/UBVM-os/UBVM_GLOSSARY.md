# UBVM Glossary — Core Terms

**Version:** 1.0  
**Author:** James / Giblets Creations  
**Scope:** UBVM runtime, SCP semantic layer, and Forge Theory ecosystem

---

## Capsule

A JSON artefact (`.scp.json`) that declares what a behaviour is, when it runs, and which primitives it calls.  
It is the atomic unit of execution in UBVM and the atomic unit of meaning in SCP.  
*See: capsule schema (UBVM Spec §2.1)*

---

## Primitive

A Python function registered in the UBVM DISPATCH table.  
Primitives are the only place executable logic lives.  
Capsules orchestrate primitives; primitives perform actions.  
*See: primitive model (UBVM Spec §2.3)*

---

## DISPATCH

A Python dictionary mapping primitive name strings to their implementing functions.  
The interpreter resolves all action primitives via DISPATCH at runtime.  
If a primitive key is not found in DISPATCH, the interpreter records an error and skips that action.  
*See: UBVM Spec §2.3*

---

## Interpreter

The UBVM component that loads a capsule, validates it, evaluates triggers, dispatches primitives, and returns a structured result object.  
It is the behavioural equivalent of a VM instruction executor.  
*See: interpreter contract (UBVM Spec §3.1)*

---

## Trigger

A condition that determines when a capsule runs.  
UBVM supports three triggers:  

- `on_load` — run once at boot  
- `cron` — run on a defined schedule  
- `on_event` — run when a matching event is emitted  
*See: trigger system (UBVM Spec §3.2)*

---

## Behaviour

A single entry in a capsule's `behaviours[]` array.  
Each behaviour contains a trigger, an optional `schedule` or `event` field, and a list of actions.  
A capsule may define multiple behaviours; each is evaluated independently.

---

## Action

A single primitive invocation inside a behaviour.

```json
{ "primitive": "log", "params": { "message": "hello" } }
```

Actions are executed in order. A failed action is recorded but does not halt remaining actions.

---

## Context Object

A runtime object injected by the interpreter into every primitive call.  
Guaranteed fields: `scp_id`, `ubvm_home`, `timestamp`, filtered environment variables.  
Primitive authors may rely on all four fields being present.  
*See: context object (UBVM Spec §2.3)*

---

## Event Bus

A file-based, append-only queue (`logs/events/queue.jsonl`) used for inter-capsule communication.  
Events are written by `emit_event` and consumed by the scheduler daemon.  
*See: event bus (UBVM Spec §4)*

---

## Scheduler Daemon

A single UBVM process (`scheduler_daemon.py`) that handles both cron and event triggers.

- **Cron loop:** evaluates `cron` triggers once per minute, runs matching behaviours.
- **Event loop:** tails `queue.jsonl`, matches events to capsules with `on_event` triggers, invokes the interpreter for each match.

Both loops run within the same process. Maintained via `ubvm schedule`.  
*See: event bus (UBVM Spec §4)*

---

## Event Cursor

A persistent byte-offset value stored in `logs/events/.cursor`.  
The scheduler daemon uses it to resume tailing the event queue after a restart, without reprocessing old events.

---

## UBVM_HOME

The root directory of a UBVM installation.  
Defaults to the directory containing `interpreter.py`. Overridable via the `UBVM_HOME` environment variable.  
Contains: `capsules/`, `logs/`, `data/`, `results/`, `strategies/`, `anchors/`  
*See: directory layout (UBVM Spec §5)*

---

## Object Class

SCP-style classification of a capsule's risk level and containment requirements:

| Class | Meaning |
|-------|---------|

| `Safe` | Low risk. Runs freely. |
| `Euclid` | Moderate complexity. Monitored. |
| `Keter` | High risk or unpredictable. Requires explicit controls. |
| `Thaumiel` | System-level. Governs other capsules. |

UBVM treats object class as advisory metadata. Higher-level systems (e.g. LEGION) may enforce policy based on this value.  
*See: object classes (UBVM Spec §2.2)*

---

## Containment

A capsule's declared safety constraints, expressed as fields in the `containment` object:  

- `read_only` — capsule should not write state  
- `audit_log` — all actions should be logged  
- `kill_switch` — capsule can be halted by a stop signal  

These fields are advisory in UBVM Core. Enforcement is the responsibility of the runtime or a higher-level system such as LEGION.

---

## Result Object

The structured output returned by the interpreter after executing a capsule.  

```json
{
  "scp_id":  "namespace/capsule-name",
  "status":  "ok | error | partial",
  "results": [],
  "errors":  [],
  "events":  []
}
```

`partial` is returned when some actions succeeded and others failed within the same execution.  
*See: interpreter contract (UBVM Spec §3.1)*

---

## Extension Primitive

A primitive not part of UBVM Core 1.0.  
Domain-specific logic (e.g. trading, data processing, ML) is implemented as extension primitives and registered alongside core primitives in DISPATCH.  
Extension primitives must not override core primitive names.  
*See: extension model (UBVM Spec §8)*

---

## UBVM Core 1.0

The mandatory primitive set required for UBVM compliance:  
`log`, `emit_event`, `http_request`, `read_file`, `write_file`, `exec`, `spawn.agent`, `render_template`, `render.component`, `validate_self`, `mutate`, `get_device`  
*See: core primitive set (UBVM Spec §7)*

---

## Compliance Suite

A set of fixture capsules and tests that verify a runtime meets the UBVM specification.  
Executed via `ubvm test`. A runtime must pass all categories to be considered UBVM-compliant.  
*See: compliance test suite (UBVM Spec §15)*

---

## Organism

A system composed of multiple capsules running under UBVM, communicating via the event bus, and governed by SCP.  
LEGION is the first UBVM organism.

---

## Node

A single UBVM runtime instance running on a physical or virtual machine (phone, VPS, PC).  
Multiple nodes can form a distributed UBVM cluster. Inter-node communication is outside UBVM Core 1.0 scope.

---

## Anchor

An immutable snapshot of a best-known artefact (e.g. a validated trading strategy) stored under `anchors/` with a timestamp and performance snapshot.  
Used as a baseline for future comparisons.

---

## Domain Artefact

A capsule or JSON file representing a domain-specific decision object — a trading strategy, a model configuration, a rule set.  
Domain artefacts are generated, mutated, validated, and selected by UBVM primitives.  
Specific implementations (e.g. Strategy Capsule in the trading OS) are domain extensions of this concept.

---

## Thaumiel Capsule

A capsule with `object_class: "Thaumiel"` — system-level behaviour that governs other capsules.  
Examples: orchestrators, auditors, selectors, kill-switch controllers.  
Thaumiel capsules are the only capsules that should emit events intended to trigger other capsules in a chain.

---

*This glossary is a living document. Terms are added when they enter the UBVM spec or a companion document. Terms are never removed — only deprecated with a note.*

## Motto

"I wanted it. So I forged it. Now forge yours."
