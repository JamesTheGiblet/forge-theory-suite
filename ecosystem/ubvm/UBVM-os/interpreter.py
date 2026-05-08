#!/usr/bin/env python3
"""
UBVM interpreter.py
Universal Behavioural Virtual Machine — Core Runtime
Version: 0.2
Author: James / Giblets Creations

Implements:
- Capsule schema validation
- scp_version rejection
- context object injection
- DISPATCH table with all UBVM Core 1.0 primitives
- emit_event writing to queue.jsonl
- Structured result object with ok / error / partial status
- Exception isolation per action
"""

import json
import os
import sys
import datetime
import string
import random
import subprocess
import importlib.util

# ─────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────

SUPPORTED_VERSIONS = {"0.1"}
UBVM_VERSION       = "0.2"

# ─────────────────────────────────────────────────────────────
# DEVICE BRIDGE & ENV SETUP
# ─────────────────────────────────────────────────────────────

def setup_device_env():
    """Identify device (Termux vs PC) and set default environment variables."""
    # 1. Identify if we are on Android (Termux) or Windows (PC)
    if "com.termux" in os.environ.get("PREFIX", ""):
        device = "mobile"
        os.environ.setdefault("UBVM_NODE_ID", "ubvm/node-mobile")
    elif os.name == "nt":
        device = "pc"
        os.environ.setdefault("UBVM_NODE_ID", "ubvm/node-pc")
    else:
        device = "unknown"
        os.environ.setdefault("UBVM_NODE_ID", f"ubvm/node-{os.name}")

    os.environ["UBVM_DEVICE"] = device

    # 2. Set context-aware defaults for Ollama endpoints
    if device == "pc":
        os.environ.setdefault("OLLAMA_HOST", "http://localhost:11434")
        os.environ.setdefault("OLLAMA_MODEL", "phi3")
    else:
        os.environ.setdefault("OLLAMA_HOST", "http://178.105.96.89:11434")
        os.environ.setdefault("OLLAMA_MODEL", "gemma2:2b")

setup_device_env()

# ─────────────────────────────────────────────────────────────
# CONTEXT BUILDER
# ─────────────────────────────────────────────────────────────

def build_context(capsule: dict) -> dict:
    """
    Build the guaranteed context object injected into every primitive call.
    Fields: scp_id, ubvm_home, timestamp, env, capsule
    """
    ubvm_home = os.environ.get(
        "UBVM_HOME",
        os.path.dirname(os.path.abspath(__file__))
    )
    env = {
        k: v for k, v in os.environ.items()
        if k.startswith("UBVM_") or k.startswith("UBC_")
    }
    return {
        "scp_id":    capsule.get("scp_id", "unknown"),
        "ubvm_home": ubvm_home,
        "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "env":       env,
        "capsule":   capsule,  # full capsule for validate_self and introspection
    }


# ─────────────────────────────────────────────────────────────
# PRIMITIVES — UBVM CORE 1.0
# ─────────────────────────────────────────────────────────────

def primitive_log(params: dict, context: dict) -> dict:
    """Write a message to stdout and the UBVM log file."""
    msg = params.get("message")
    if not isinstance(msg, str):
        return {"status": "error", "error": "Invalid or missing 'message' parameter."}

    level     = params.get("level", "info").upper()
    ts        = context["timestamp"]
    scp_id    = context["scp_id"]
    line      = f"[{ts}] [{level}] [{scp_id}] {msg}"

    print(line)

    # Append to log file
    log_dir = os.path.join(context["ubvm_home"], "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, "ubvm.log")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(line + "\n")

    return {"status": "ok", "logged": msg}


def primitive_emit_event(params: dict, context: dict) -> dict:
    """
    Append an event to the event bus queue.
    Format: {event, source, payload, ts} — one JSON object per line.
    """
    event = params.get("event")
    if not isinstance(event, str):
        return {"status": "error", "error": "Invalid or missing 'event' parameter."}

    payload = params.get("payload", {})
    entry   = {
        "event":   event,
        "source":  context["scp_id"],
        "payload": payload,
        "ts":      context["timestamp"],
    }

    # Ensure queue directory exists
    queue_dir  = os.path.join(context["ubvm_home"], "logs", "events")
    queue_path = os.path.join(queue_dir, "queue.jsonl")
    os.makedirs(queue_dir, exist_ok=True)

    with open(queue_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

    return {"status": "ok", "event": event, "queued": entry}


def primitive_http_request(params: dict, context: dict) -> dict:
    """HTTP GET or POST. Returns response body as string."""
    import urllib.request
    import urllib.error

    url    = params.get("url")
    method = params.get("method", "GET").upper()
    data   = params.get("data")
    headers = params.get("headers", {})

    if not isinstance(url, str):
        return {"status": "error", "error": "Invalid or missing 'url' parameter."}

    try:
        body = json.dumps(data).encode() if data else None
        req  = urllib.request.Request(url, data=body, method=method)
        req.add_header("Content-Type", "application/json")
        for k, v in headers.items():
            req.add_header(k, v)

        with urllib.request.urlopen(req, timeout=10) as resp:
            response_body = resp.read().decode("utf-8")
            return {"status": "ok", "body": response_body, "http_status": resp.status}

    except urllib.error.HTTPError as e:
        return {"status": "error", "error": str(e), "http_status": e.code}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def primitive_read_file(params: dict, context: dict) -> dict:
    """Read a file from an allowed path."""
    path = params.get("path")
    if not isinstance(path, str):
        return {"status": "error", "error": "Invalid or missing 'path' parameter."}

    # Resolve relative paths against UBVM_HOME
    if not os.path.isabs(path):
        path = os.path.join(context["ubvm_home"], path)

    try:
        with open(path, "r") as f:
            content = f.read()
        return {"status": "ok", "content": content, "path": path}
    except FileNotFoundError:
        return {"status": "error", "error": f"File not found: {path}"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def primitive_write_file(params: dict, context: dict) -> dict:
    """Write content to a file. Relative paths resolve to UBVM_HOME."""
    path    = params.get("path")
    content = params.get("content", "")

    if content is None:
        content = ""

    if not isinstance(path, str):
        return {"status": "error", "error": "Invalid or missing 'path' parameter."}

    if not os.path.isabs(path):
        path = os.path.join(context["ubvm_home"], path)

    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(content)
        return {"status": "ok", "path": path}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def primitive_exec(params: dict, context: dict) -> dict:
    """Run a shell command. Requires UBC_ALLOW_EXEC=1."""
    if context["env"].get("UBC_ALLOW_EXEC") != "1":
        return {"status": "error", "error": "exec primitive disabled. Set UBC_ALLOW_EXEC=1 to enable."}

    command = params.get("command")
    if not isinstance(command, str):
        return {"status": "error", "error": "Invalid or missing 'command' parameter."}

    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=30
        )
        return {
            "status":    "ok" if result.returncode == 0 else "error",
            "stdout":    result.stdout,
            "stderr":    result.stderr,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "error": "Command timed out after 30s"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def primitive_spawn_agent(params: dict, context: dict) -> dict:
    """Spawn a subprocess and return its PID."""
    command = params.get("command")
    if not isinstance(command, str):
        return {"status": "error", "error": "Invalid or missing 'command' parameter."}

    try:
        proc = subprocess.Popen(
            command, shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return {"status": "ok", "pid": proc.pid, "command": command}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def primitive_render_template(params: dict, context: dict) -> dict:
    """String template substitution using $variable syntax."""
    template  = params.get("template")
    variables = params.get("variables", {})

    if not isinstance(template, str):
        return {"status": "error", "error": "Invalid or missing 'template' parameter."}

    try:
        result = string.Template(template).substitute(variables)
        return {"status": "ok", "output": result}
    except KeyError as e:
        return {"status": "error", "error": f"Missing template variable: {e}"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def primitive_render_component(params: dict, context: dict) -> dict:
    """Generate a simple HTML dashboard component and write to file."""
    title   = params.get("title", "UBVM Dashboard")
    content = params.get("content", "")
    path    = params.get("path", "logs/dashboard.html")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title}</title>
    <style>
        :root {{ --bg: #09090b; --surface: #18181b; --border: #27272a; --accent: #10b981; --text: #e4e4e7; --muted: #a1a1aa; }}
        body {{ font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; display: flex; justify-content: center; margin: 0; }}
        .container {{ max-width: 1200px; width: 100%; }}
        h1 {{ font-weight: 600; letter-spacing: -0.025em; display: flex; align-items: center; gap: 0.5em; }}
        h1::before {{ content: ""; display: inline-block; width: 12px; height: 12px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 12px var(--accent); }}
        pre {{ background: var(--surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border); font-family: 'JetBrains Mono', Consolas, monospace; font-size: 0.9em; overflow-x: auto; color: var(--accent); box-shadow: 0 8px 32px rgba(0,0,0,0.5); line-height: 1.5; }}
        .footer {{ color: var(--muted); font-size: 0.85em; margin-top: 1.5em; border-top: 1px solid var(--border); padding-top: 1em; display: flex; justify-content: space-between; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{title}</h1>
        <pre>{content}</pre>
        <div class="footer">
            <span>UBVM Organism Dashboard</span>
            <span>Generated: {context['timestamp']}</span>
        </div>
    </div>
</body>
</html>"""

    result = primitive_write_file({"path": path, "content": html}, context)
    if result["status"] == "ok":
        return {"status": "ok", "path": result["path"], "title": title}
    return result


def primitive_validate_self(params: dict, context: dict) -> dict:
    """
    Validate the currently running capsule against the minimum UBVM schema.

    Checks:
    - Required fields present: scp_version, scp_id, object_class, intent, behaviours
    - scp_version is supported
    - object_class is a known value
    - intent is a non-empty string
    - behaviours is a non-empty list
    - Each behaviour has a valid trigger
    - Unknown fields are permitted — not rejected (SCP compliance)
    - Context fields are present and correct
    """
    REQUIRED_FIELDS   = ["scp_version", "scp_id", "object_class", "intent", "behaviours"]
    VALID_CLASSES     = {"Safe", "Euclid", "Keter", "Thaumiel"}
    VALID_TRIGGERS    = {"on_load", "cron", "on_event"}
    REQUIRED_CONTEXT  = ["scp_id", "ubvm_home", "timestamp", "env"]

    errors   = []
    warnings = []

    # Validate context
    missing_ctx = [f for f in REQUIRED_CONTEXT if f not in context]
    if missing_ctx:
        errors.append(f"Context missing fields: {missing_ctx}")

    # Get capsule from context
    capsule = context.get("capsule", {})
    if not capsule:
        errors.append("Capsule not available in context — cannot validate schema")
        return {
            "status":   "error",
            "errors":   errors,
            "warnings": warnings,
            "validated": context.get("scp_id", "unknown"),
        }

    # Required fields
    missing = [f for f in REQUIRED_FIELDS if f not in capsule]
    if missing:
        errors.append(f"Missing required fields: {missing}")

    # scp_version
    version = capsule.get("scp_version")
    if version and version not in SUPPORTED_VERSIONS:
        errors.append(f"Unsupported scp_version: '{version}'")

    # object_class
    obj_class = capsule.get("object_class")
    if obj_class and obj_class not in VALID_CLASSES:
        errors.append(f"Invalid object_class: '{obj_class}'. Valid: {VALID_CLASSES}")

    # intent
    intent = capsule.get("intent")
    if intent is not None:
        if not isinstance(intent, str) or not intent.strip():
            errors.append("intent must be a non-empty string")
        elif len(intent.split('.')) > 3:
            warnings.append("intent should be a single sentence")

    # behaviours
    behaviours = capsule.get("behaviours")
    if behaviours is not None:
        if not isinstance(behaviours, list) or len(behaviours) == 0:
            errors.append("behaviours must be a non-empty list")
        else:
            for i, b in enumerate(behaviours):
                trigger = b.get("trigger")
                if trigger not in VALID_TRIGGERS:
                    errors.append(f"behaviours[{i}]: invalid trigger '{trigger}'")
                if trigger == "cron" and not b.get("schedule"):
                    errors.append(f"behaviours[{i}]: cron trigger requires 'schedule'")
                if trigger == "on_event" and not b.get("event"):
                    errors.append(f"behaviours[{i}]: on_event trigger requires 'event'")

    status = "error" if errors else ("warning" if warnings else "ok")
    result = {
        "status":    status,
        "validated": context.get("scp_id", "unknown"),
        "warnings":  warnings,
    }
    if errors:
        result["errors"] = errors
    return result


def primitive_mutate(params: dict, context: dict) -> dict:
    """Apply a small random change to a string or number value."""
    value     = params.get("value")
    mode      = params.get("mode", "auto")
    magnitude = params.get("magnitude", 0.1)

    if isinstance(value, (int, float)):
        delta   = value * magnitude * random.choice([-1, 1])
        mutated = type(value)(value + delta)
        return {"status": "ok", "original": value, "mutated": mutated}

    if isinstance(value, str):
        # Randomly alter one character
        if not value:
            return {"status": "ok", "original": value, "mutated": value}
        idx     = random.randint(0, len(value) - 1)
        chars   = string.ascii_letters + string.digits
        mutated = value[:idx] + random.choice(chars) + value[idx+1:]
        return {"status": "ok", "original": value, "mutated": mutated}

    return {"status": "error", "error": "Value must be a string or number."}


def primitive_get_device(params: dict, context: dict) -> dict:
    """Return information about the current UBVM device/node environment."""
    env = context.get("env", {})
    return {
        "status": "ok",
        "device": env.get("UBVM_DEVICE", "unknown"),
        "node_id": env.get("UBVM_NODE_ID", "unknown")
    }

# ─────────────────────────────────────────────────────────────
# DISPATCH TABLE
# ─────────────────────────────────────────────────────────────

DISPATCH = {
    # UBVM Core 1.0
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
    "get_device":       primitive_get_device,
}


def build_dispatch(ubvm_home: str = None, verbose: bool = True) -> dict:
    """
    Build the full DISPATCH table by merging core primitives with any
    extension packages found in UBVM_HOME/extensions/.

    Each extension must contain primitives.py with a register() -> dict function.
    Extensions may shadow core primitives — last loaded wins (alphabetical order).
    Failed extensions warn and continue — they do not halt.

    Returns merged dispatch dict: core + extensions.
    """
    if ubvm_home is None:
        ubvm_home = os.environ.get("UBVM_HOME", os.path.dirname(os.path.abspath(__file__)))

    extensions_dir = os.path.join(ubvm_home, "extensions")
    merged = dict(DISPATCH)  # copy core — never mutate the original

    if not os.path.isdir(extensions_dir):
        return merged

    packages = sorted([
        d for d in os.listdir(extensions_dir)
        if os.path.isdir(os.path.join(extensions_dir, d))
        and not d.startswith("_")
    ])

    for package in packages:
        prim_path = os.path.join(extensions_dir, package, "primitives.py")
        if not os.path.exists(prim_path):
            if verbose:
                print(f"[EXT] {package}: no primitives.py — skipped")
            continue
        try:
            spec   = importlib.util.spec_from_file_location(
                f"ubvm_ext_{package}", prim_path
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            if not hasattr(module, "register"):
                if verbose:
                    print(f"[EXT] {package}: no register() — skipped")
                continue

            primitives = module.register()
            if not isinstance(primitives, dict):
                if verbose:
                    print(f"[EXT] {package}: register() must return dict — skipped")
                continue

            shadowed = [k for k in primitives if k in DISPATCH]
            if shadowed and verbose:
                print(f"[EXT] {package}: shadowing core primitives: {shadowed}")

            merged.update(primitives)

            if verbose:
                print(f"[EXT] {package}: loaded {len(primitives)} primitive(s)"
                      f" → {list(primitives.keys())}")

        except Exception as e:
            print(f"[EXT] {package}: FAILED — {e}")
            # Warn and continue

    return merged


# ─────────────────────────────────────────────────────────────
# STATUS COMPUTATION
# ─────────────────────────────────────────────────────────────

def compute_status(results: list, errors: list) -> str:
    if not errors:
        return "ok"
    if not results:
        return "error"
    return "partial"


# ─────────────────────────────────────────────────────────────
# PARAMETER SUBSTITUTION
# ─────────────────────────────────────────────────────────────

def _get_value_from_path(obj, path):
    """Helper to retrieve a value from a nested object via a dot-notation path."""
    keys = path.split('.')
    val = obj
    for key in keys:
        if isinstance(val, dict):
            val = val.get(key)
        elif isinstance(val, list):
            try:
                val = val[int(key)]
            except (IndexError, ValueError):
                return None
        else:
            return None
    return val

def _substitute_value(value, context, results_so_far):
    """Substitute a single string value if it's a template."""
    if not isinstance(value, str) or not value.startswith('$'):
        return value

    if value.startswith('$context.'):
        path = value[len('$context.'):]
        return _get_value_from_path(context, path)

    if value.startswith('$results.'):
        path = value[len('$results.'):]
        # The first part of the path is the index into results_so_far
        # e.g., $results.0.result.output_path
        return _get_value_from_path(results_so_far, path)

    return value # Not a recognized template

def substitute_params(params, context, results_so_far):
    """Recursively substitute template strings in a params object."""
    if isinstance(params, dict):
        return {k: substitute_params(v, context, results_so_far) for k, v in params.items()}
    elif isinstance(params, list):
        return [substitute_params(i, context, results_so_far) for i in params]
    else:
        return _substitute_value(params, context, results_so_far)


# ─────────────────────────────────────────────────────────────
# TRIGGER EVALUATION
# ─────────────────────────────────────────────────────────────

def trigger_matches(behaviour: dict, trigger_type: str, event_name: str = None) -> bool:
    """
    Returns True if a behaviour's trigger matches the current execution context.
    trigger_type: "on_load" | "cron" | "on_event"
    event_name:   the event name when trigger_type is "on_event"
    """
    t = behaviour.get("trigger")
    if t != trigger_type:
        return False
    if trigger_type == "on_event":
        event = behaviour.get("event")
        return event == event_name or event == "*"
    return True


# ─────────────────────────────────────────────────────────────
# CORE INTERPRETER
# ─────────────────────────────────────────────────────────────

def run_capsule(
    capsule: dict,
    trigger_type: str = "on_load",
    event_name: str = None,
    event_payload: dict = None,
    dispatch: dict = None
) -> dict:
    """
    Execute a capsule for a given trigger type.

    Steps:
    1. Check scp_version — reject unsupported versions
    2. Validate minimum schema
    3. For each matching behaviour, dispatch primitives
    4. Return structured result object
    """
    scp_id = capsule.get("scp_id", "unknown")
    _active_dispatch = dispatch if dispatch is not None else DISPATCH

    # 1. Version check
    version = capsule.get("scp_version")
    if version not in SUPPORTED_VERSIONS:
        return {
            "scp_id":  scp_id,
            "status":  "error",
            "results": [],
            "logs":    [],
            "errors":  [f"Unsupported scp_version: '{version}'. Supported: {SUPPORTED_VERSIONS}"],
            "events":  [],
        }

    # 2. Minimum schema validation
    required_fields = ["scp_id", "object_class", "intent", "behaviours"]
    missing = [f for f in required_fields if f not in capsule]
    if missing:
        return {
            "scp_id":  scp_id,
            "status":  "error",
            "results": [],
            "logs":    [],
            "errors":  [f"Invalid capsule schema — missing fields: {missing}"],
            "events":  [],
        }

    if not isinstance(capsule["behaviours"], list) or len(capsule["behaviours"]) == 0:
        return {
            "scp_id":  scp_id,
            "status":  "error",
            "results": [],
            "logs":    [],
            "errors":  ["behaviours must be a non-empty list"],
            "events":  [],
        }

    valid_triggers = {"on_load", "cron", "on_event", "manual"}
    invalid_triggers = [b.get("trigger") for b in capsule["behaviours"] if b.get("trigger") not in valid_triggers]
    if invalid_triggers:
        return {
            "scp_id":  scp_id,
            "status":  "error",
            "results": [],
            "logs":    [],
            "errors":  [f"Invalid trigger type(s): {invalid_triggers}"],
            "events":  [],
        }

    # 3. Build context
    context = build_context(capsule)
    if trigger_type == "on_event":
        context["event"] = {
            "name": event_name,
            "payload": event_payload or {}
        }

    results = []
    errors  = []
    events  = []

    # 4. Execute matching behaviours
    for behaviour in capsule["behaviours"]:
        if not trigger_matches(behaviour, trigger_type, event_name):
            continue

        # Store results for this behaviour's actions to allow chaining
        action_results_so_far = []

        for action in behaviour.get("actions", []):
            prim_name = action.get("primitive")
            # Resolve params using results from previous actions and context
            params = substitute_params(action.get("params", {}), context, action_results_so_far)
            primitive = _active_dispatch.get(prim_name)

            if primitive is None:
                errors.append(f"Unknown primitive: '{prim_name}'")
                continue  # Skip — do not halt remaining actions

            try:
                result = primitive(params, context)
                # Append to main results list for the final output
                results.append({"primitive": prim_name, "result": result})
                # Append the raw primitive output for chaining within this behaviour
                action_results_so_far.append(result)

                # Collect any events emitted by the primitive
                if prim_name == "emit_event" and isinstance(result, dict) and result.get("status") == "ok":
                    events.append(result["event"])
            except Exception as e:
                errors.append(f"Primitive '{prim_name}' raised exception: {str(e)}")
                # Exception isolated — continue with next action

    return {
        "scp_id":  scp_id,
        "status":  compute_status(results, errors),
        "results": results,
        "logs":    [],
        "errors":  errors,
        "events":  events,
    }


# ─────────────────────────────────────────────────────────────
# CAPSULE LOADER
# ─────────────────────────────────────────────────────────────

def load_capsule(path: str) -> dict:
    """Load and parse a .scp.json file. Returns capsule dict or raises."""
    with open(path, "r") as f:
        return json.load(f)


def load_all_capsules(capsules_dir: str, recursive: bool = True) -> list:
    """
    Load all .scp.json files from a directory.
    If recursive=True, also scans subdirectories (e.g. fixtures/).
    Returns list of (path, capsule), sorted by path for deterministic order.
    """
    capsules = []
    if not os.path.isdir(capsules_dir):
        return capsules

    for entry in sorted(os.scandir(capsules_dir), key=lambda e: e.name):
        if entry.is_file() and entry.name.endswith(".scp.json"):
            try:
                capsule = load_capsule(entry.path)
                capsules.append((entry.path, capsule))
            except Exception as e:
                print(f"[WARN] Failed to load {entry.name}: {e}")
        elif entry.is_dir() and recursive:
            capsules.extend(load_all_capsules(entry.path, recursive=True))

    return capsules


# ─────────────────────────────────────────────────────────────
# MAIN — direct execution
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: interpreter.py <capsule.scp.json> [trigger_type] [event_name]")
        sys.exit(1)

    capsule_path = sys.argv[1]
    trigger       = sys.argv[2] if len(sys.argv) > 2 else "on_load"
    event_name    = sys.argv[3] if len(sys.argv) > 3 else None
    event_payload_str = sys.argv[4] if len(sys.argv) > 4 else None

    try:
        capsule = load_capsule(capsule_path)
    except Exception as e:
        print(f"Error loading capsule: {e}")
        sys.exit(1)

    payload = None
    if event_payload_str:
        try:
            payload = json.loads(event_payload_str)
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON for event_payload: {event_payload_str}")

    dispatch = build_dispatch(verbose=False)
    result = run_capsule(capsule, trigger_type=trigger, event_name=event_name, event_payload=payload, dispatch=dispatch)
    print(json.dumps(result, indent=2))

    sys.exit(0 if result["status"] in ("ok", "partial") else 1)
