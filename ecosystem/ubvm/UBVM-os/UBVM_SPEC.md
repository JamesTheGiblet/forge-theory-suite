# UBVM — Universal Behavioural Virtual Machine

**Version:** 0.2 (Spec Draft)  
**Author:** James / Giblets Creations  
**Role:** Universal runtime for SCP (Semantic Capsule Protocol) capsules  
**Supported `scp_version`:** `0.1`

---

## 1. Purpose

UBVM is a JSON-driven behavioural virtual machine.

- **Unit of execution:** the capsule (`.scp.json`)
- **Unit of logic:** the primitive (Python function)
- **Goal:** make all behaviour in your systems declarative, portable, and meaning-first

UBVM is the reference runtime for SCP. Any system that "supports SCP" is implementing the UBVM interpreter contract.

---

## 2. Core Model

### 2.1 Capsule

A capsule is a JSON artefact that declares what it is, what it intends to do, how it is contained, when it runs, and which primitives it calls.

**Minimum valid schema:**

```json
{
  "scp_version":  "0.1",
  "scp_id":       "namespace/capsule-name",
  "object_class": "Safe",
  "intent":       "One sentence describing what this capsule does.",
  "containment": {
    "read_only":   false,
    "audit_log":   true,
    "kill_switch": false
  },
  "behaviours": [
    {
      "trigger":  "on_load | cron | on_event",
      "schedule": "*/5 * * * *",
      "event":    "event.name",
      "actions": [
        { "primitive": "<primitive_name>", "params": {} }
      ]
    }
  ]
}
```

`trigger` is required on every behaviour. `schedule` is required when `trigger` is `cron`. `event` is required when `trigger` is `on_event`. Both are ignored otherwise.

**Version compatibility:** The interpreter rejects any capsule whose `scp_version` it does not recognise, logs an error, and halts execution of that capsule. It does not affect other capsules.

---

### 2.2 Object Classes

SCP-style containment classes. Treated as advisory metadata by UBVM; higher-level systems (e.g. LEGION) may enforce policy based on these values.

| Class | Meaning |
|-------|---------|

| `Safe` | Low risk. Runs freely. |
| `Euclid` | Moderate complexity. Monitored. |
| `Keter` | High risk or unpredictable. Requires explicit containment controls. |
| `Thaumiel` | System-level. Governs other capsules. |

---

### 2.3 Primitive

A primitive is a Python function implementing a single atomic behaviour.

**Signature:**

```python
def primitive_name(params: dict, context: dict) -> dict:
    ...
```

- `params` — arguments passed from the capsule `actions` entry
- `context` — runtime context injected by the interpreter (see below)
- **Return** — a JSON-serialisable dict; must include at minimum a `status` key

**The `context` object (guaranteed fields):**

```python
{
    "scp_id":    "namespace/capsule-name",  # ID of the running capsule
    "ubvm_home": "/sdcard/UBC",             # Resolved UBVM_HOME path
    "timestamp": "2026-05-05T08:08:00Z",    # ISO 8601 UTC at invocation
    "env": {                                 # Filtered OS environment
        "UBC_ALLOW_EXEC": "1"               # Only UBVM_ / UBC_ prefixed vars included
    }
}
```

Primitives may rely on all four fields being present. Additional fields are not guaranteed and must be treated as optional.

**Primitives are registered in a DISPATCH table:**

```python
DISPATCH = {
    "log":              primitive_log,
    "emit_event":       primitive_emit_event,
    "http_request":     primitive_http_request,
    "read_file":        primitive_read_file,
    "write_file":       primitive_write_file,
    "exec":             primitive_exec,
    "spawn.agent":      primitive_spawn_agent,
    "render_template":  primitive_render_template,
    "render.component": primitive_render_component,
    "validate_self":    primitive_validate_self,
    "mutate":           primitive_mutate,
}
```

Primitive names use `snake_case`. This is the canonical convention. Capsule `actions` must reference primitives using the exact key string as registered in DISPATCH.

---

## 3. Runtime Behaviour

### 3.1 Interpreter Contract

Given a capsule JSON object, the interpreter must:

1. Check `scp_version`. If not in the supported set, reject with error and halt.
2. Validate minimum schema: `scp_id`, `object_class`, `intent`, `behaviours[]` present and non-empty.
3. For each behaviour whose trigger condition is currently met:
   - Resolve each action's `primitive` key via DISPATCH. If not found, record error and skip that action.
   - Call the primitive with `params` (from capsule) and `context` (from interpreter).
   - Collect return value into `results`. Collect any raised exception into `errors`.
4. Return a structured result object:

```json
{
  "scp_id":  "namespace/capsule-name",
  "status":  "ok | error | partial",
  "results": [],
  "logs":    [],
  "errors":  [],
  "events":  []
}
```

`partial` is used when some actions succeeded and others failed within the same behaviour.

---

### 3.2 Triggers

**`on_load`**  
Run once when `ubvm boot` is invoked. Used for initialisation, health checks, and system-start behaviours.

**`cron`**  
Run on the schedule defined in `schedule` (standard 5-field cron syntax). Evaluated by the scheduler daemon at one-minute resolution.

**`on_event`**  
Run when an event matching the `event` field is received from the event bus. The matching capsule is invoked by the event daemon.

---

## 4. Event Bus

**Queue file:** `$UBVM_HOME/logs/events/queue.jsonl`  
**Format:** one JSON object per line, append-only.

```json
{
  "event":   "weather.updated",
  "source":  "ubvm/sentinel-one",
  "payload": { "temp": 12.3 },
  "ts":      "2026-05-05T08:08:00Z"
}
```

**Write path:** `emit_event` primitive appends to this file.

**Read path:** The event daemon (`scheduler_daemon.py`) tails the file, matches each new line against all capsules with `trigger: "on_event"`, and invokes the interpreter for each match.

**Failure behaviour (v0.1):** If a capsule triggered by an event throws an error, the error is written to `logs/errors.log` and execution continues. Events are not retried. Failed events are not dead-lettered. This is the stated behaviour for v0.1 — not an omission.

**Cursor:** The daemon maintains a byte-offset cursor in `logs/events/.cursor` so it survives restarts without reprocessing old events.

---

## 5. Directory Layout

Canonical UBVM home (e.g. `/sdcard/UBC/` or `/opt/ubvm/`):

```text
UBVM_HOME/
├── interpreter.py          # Core runtime — DISPATCH lives here
├── boot.py                 # Boot sequence — runs on_load behaviours
├── scheduler_daemon.py     # Cron runner + event daemon
├── ubvm                    # CLI entry point
│
├── capsules/               # All .scp.json capsule definitions
│   └── sentinel_one.scp.json
│
├── data/                   # Data files (CSV, JSON)
├── logs/                   # Runtime logs
│   └── events/
│       ├── queue.jsonl     # Event bus queue (append-only)
│       └── .cursor         # Event daemon read position
├── results/                # Primitive output artefacts
├── strategies/             # Domain-specific capsules and generated JSON
│   ├── raw/
│   ├── selected/
│   └── mutated/
└── anchors/                # Immutable snapshots of best-known artefacts
```

---

## 6. CLI

```bash
ubvm run <capsule_file>     # Execute a capsule immediately
ubvm boot                   # Run boot sequence across all capsules
ubvm schedule               # Start cron + event daemon
ubvm test                   # Run compliance test suite against fixture capsules
ubvm version                # Print UBVM version
```

**Environment variables:**

| Variable | Effect |
|----------|--------|

| `UBVM_HOME` | Base directory. Defaults to directory containing `interpreter.py`. |
| `UBC_ALLOW_EXEC` | Set to `1` to enable the `exec` primitive. Disabled by default. |
| `UBVM_DEVICE` | Auto-detected device type (`mobile`, `pc`, `unknown`). Set by device bridge. |
| `UBVM_NODE_ID` | Auto-assigned node identity based on device. Set by device bridge. |
| `OLLAMA_HOST` | Ollama API endpoint. Context-aware defaults based on device type. |
| `OLLAMA_MODEL` | Ollama model to use. Context-aware defaults based on device type. |

**Device Bridge:**  
The runtime automatically detects the executing environment (e.g., Android Termux vs. Windows PC) and seeds `os.environ` with context-aware defaults for the variables above. This ensures capsules and domain extensions run with optimal settings (like local vs remote LLMs) without requiring manual configuration.

---

## 7. Core Primitive Set (UBVM Core 1.0)

These primitives must be present in any compliant UBVM implementation.

| Primitive | Description |
|-----------|-------------|

| `log` | Write a message to stdout and/or log file |
| `emit_event` | Append an event to the event queue |
| `http_request` | HTTP GET or POST; returns response body |
| `read_file` | Read a file from an allowed path |
| `write_file` | Write content to a file (path-restricted) |
| `exec` | Run a shell command (requires `UBC_ALLOW_EXEC=1`) |
| `spawn.agent` | Spawn a subprocess |
| `render_template` | String template substitution |
| `render.component` | Generate an HTML/visual component |
| `validate_self` | Validate the running capsule against its schema |
| `mutate` | Apply a small random change to a string or number value |
| `get_device` | Return information about the current UBVM device/node environment |

Everything else is an **extension primitive** — domain-specific and registered alongside core primitives in DISPATCH.

---

## 8. Extension & Integration

**Adding a primitive:**

1. Implement the function in `interpreter.py` using the standard signature.
2. Register it in `DISPATCH` using a `snake_case` key.
3. Reference the key string in capsule `actions`.

**Adding a domain system (e.g. LEGION trading OS):**

1. Define domain-specific extension primitives (`fetch_ohlcv`, `backtest`, `place_order`, etc.).
2. Wrap agents, loops, and strategies as capsules.
3. UBVM handles triggers, events, and orchestration. Domain code stays in primitives.

The domain system owns its data layout under `UBVM_HOME`. UBVM owns nothing below the `capsules/` and `logs/` directories.

---

## 9. Known Gaps (v0.1 → v0.2 Delta)

These are open items, not design flaws. They are tracked here as first-class facts.

| Gap | Status | Notes |
|-----|--------|-------|

| `emit_event` delivers to queue only — no daemon wired yet | Pending | Daemon spec defined in §4 |
| `scheduler_daemon.py` hardcoded to `sentinel_one` | Pending | Generic cron scanner needed |
| `split_data` primitive | Not implemented | Phase 0 build target |
| `backtest` primitive | Not implemented | Phase 0 build target |
| `forward_validate` primitive | Not implemented | Phase 1 build target |
| `strategy_generate` primitive | Not implemented | Phase 1 build target |
| `dry_run` primitive | Not implemented | Phase 2 build target |
| `context` object not yet injected by interpreter | Pending | Spec defined in §2.3 |
| Event cursor not yet implemented | Pending | Spec defined in §4 |
| `ubvm test` command not yet implemented | Pending | Spec defined in §15 |

---

## 10. Versioning Policy

UBVM follows semantic versioning: `MAJOR.MINOR.PATCH`

**MAJOR** — incremented when:

- Capsule schema changes in a non-backwards-compatible way
- Primitive signatures change
- Interpreter contract changes
- Event bus format changes

Capsules written for an older MAJOR version must not be executed by a newer interpreter unless explicitly migrated.

**MINOR** — incremented when:

- New primitives are added
- New trigger types are added
- New optional fields are added to capsule schema
- Event bus behaviour is extended in a backwards-compatible way

Capsules written for older MINOR versions must continue to run without modification.

**PATCH** — incremented when:

- Bug fixes, performance improvements, or internal behaviour changes occur
- No schema or contract changes occur

Patch updates must never break existing capsules.

> The spec is currently at `0.2`. Version `1.0` is cut when all items in §9 are resolved and the §15 compliance test suite passes in full.

---

## 11. Compliance Requirements

A runtime may call itself UBVM-compliant only if it satisfies all requirements below.

### 11.1 Mandatory Components

A compliant runtime must implement:

- The interpreter contract (§3.1)
- The capsule schema (§2.1)
- All core primitives (§7)
- The event bus (§4)
- The trigger model (§3.2)
- The directory layout (§5)

### 11.2 Behavioural Guarantees

A compliant runtime must:

- Reject unsupported `scp_version` values
- Never execute a capsule with invalid schema
- Never silently ignore missing primitives
- Always return a structured result object
- Always include `status` in primitive return values
- Preserve event ordering as written to the queue
- Maintain a persistent event cursor

### 11.3 Forbidden Behaviour

A compliant runtime must not:

- Mutate capsule files at runtime
- Execute primitives not declared in `actions`
- Execute capsules outside their trigger conditions
- Modify event queue history
- Execute shell commands unless `UBC_ALLOW_EXEC=1`

### 11.4 Extension Rules

Extensions (new primitives, new triggers, new fields) must:

- Not break existing capsules
- Not override core primitives
- Not redefine core schema fields

---

## 12. Reference Capsule (Minimal Working Example)

```json
{
  "scp_version":  "0.1",
  "scp_id":       "ubvm/example-minimal",
  "object_class": "Safe",
  "intent":       "Demonstrate minimal UBVM capsule behaviour.",
  "containment": {
    "read_only":   false,
    "audit_log":   true,
    "kill_switch": false
  },
  "behaviours": [
    {
      "trigger": "on_load",
      "actions": [
        { "primitive": "log",           "params": { "message": "UBVM minimal capsule executed." } },
        { "primitive": "emit_event",    "params": { "event": "ubvm.example-minimal.executed" } },
        { "primitive": "validate_self", "params": {} }
      ]
    }
  ]
}
```

This capsule logs a message, emits an event, and validates itself. It is the canonical hello-world of UBVM. A compliant interpreter must execute all three actions without error.

---

## 13. Reference Primitive (Fully Documented)

**Primitive name:** `log`  
**Category:** UBVM Core 1.0  
**Purpose:** Write a message to stdout and/or log file.

**Signature:**

```python
def primitive_log(params: dict, context: dict) -> dict:
```

**Parameters:**

| Field     | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `message` | string | yes      | Text to log |

**Context fields used:**

- `scp_id` — included in log line prefix
- `timestamp` — included in log line prefix
- `ubvm_home` — used to resolve log file path

**Return value:**

```json
{
  "status": "ok",
  "logged": "<message>"
}
```

**Error behaviour:**  
If `message` is missing or not a string, return:

```json
{
  "status": "error",
  "error":  "Invalid or missing 'message' parameter."
}
```

The interpreter marks the action as failed but continues executing remaining actions in the behaviour.

---

## 14. Interpreter Pseudocode (Language-Agnostic)

```pseudocode
function run_capsule(capsule):
    if capsule.scp_version not in SUPPORTED_VERSIONS:
        return error("Unsupported scp_version")

    if not validate_schema(capsule):
        return error("Invalid capsule schema")

    results = []
    errors  = []
    events  = []

    for behaviour in capsule.behaviours:
        if trigger_matches(behaviour):
            for action in behaviour.actions:
                primitive = DISPATCH.get(action.primitive)
                if primitive is None:
                    errors.append("Unknown primitive: " + action.primitive)
                    continue

                try:
                    result = primitive(action.params, build_context(capsule))
                    results.append(result)
                    if "events" in result:
                        events.extend(result.events)
                except Exception as e:
                    errors.append(str(e))

    status = compute_status(results, errors)
    # ok      → no errors
    # error   → all actions failed
    # partial → some actions failed

    return {
        "scp_id":  capsule.scp_id,
        "status":  status,
        "results": results,
        "errors":  errors,
        "events":  events
    }
```

This pseudocode is intentionally minimal and language-neutral. Any language implementing this contract is UBVM-compliant.

---

## 15. Compliance Test Suite

A compliant runtime must pass all tests below. The reference implementation ships a test runner accessible via `ubvm test`, which executes fixture capsules from `capsules/fixtures/` and reports pass/fail per category.

### 15.1 Capsule Validation Tests

- Missing `scp_id` → reject
- Missing `behaviours` → reject
- Unsupported `scp_version` → reject
- Invalid trigger type → reject

### 15.2 Primitive Dispatch Tests

- Known primitive executes successfully
- Unknown primitive produces error but does not halt capsule
- Primitive exceptions are caught and recorded in `errors[]`

### 15.3 Trigger Tests

- `on_load` executes exactly once per boot
- `cron` executes on correct schedule (tested via mock clock)
- `on_event` executes only on matching event name; does not fire on non-matching events

### 15.4 Event Bus Tests

- Events append correctly to `queue.jsonl`
- Cursor persists across daemon restarts
- Events are processed in written order
- Invalid (malformed) event lines are skipped without halting the daemon

### 15.5 Result Object Tests

- `status` is `ok` when all actions succeed
- `status` is `error` when all actions fail
- `status` is `partial` when some actions fail
- `results[]` contains one entry per successful action
- `errors[]` contains one entry per failed action
- `events[]` contains all events emitted during execution

---

## 16. Summary

UBVM 0.2 defines:

- A capsule schema (§2.1)
- A primitive model (§2.3)
- An interpreter contract (§3.1)
- A trigger system (§3.2)
- An event bus (§4)
- A directory layout (§5)
- A CLI (§6)
- A core primitive set (§7)
- An extension model (§8)
- A versioning policy (§10)
- Compliance requirements (§11)
- A reference capsule (§12)
- A reference primitive (§13)
- Language-agnostic pseudocode (§14)
- A compliance test suite (§15)

**Version 1.0 is cut when:** all items in §9 are resolved and `ubvm test` passes in full.

---

## UBVM Ecosystem

UBVM is part of the Forge Theory ecosystem. Capsules are the executable layer of SCP — portable across BuddAI, Data Cube, Legion, and Data Cube. Any system implementing the interpreter contract in §3.1 is SCP-compliant.

> "I wanted it. So I forged it. Now forge yours."
