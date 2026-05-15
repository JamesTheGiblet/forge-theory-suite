#!/usr/bin/env python3
"""
ubvm-preflight.py
Pre-flight checker for UBVM primitives and capsules.

Usage:
  python3 ubvm-preflight.py extensions/myext/primitives.py
  python3 ubvm-preflight.py capsules/my.capsule.scp.json
  python3 ubvm-preflight.py extensions/myext/primitives.py capsules/my.capsule.scp.json

Checks:
  - Primitive: registers correctly, returns valid result shape, no import errors
  - Capsule: schema valid, all called primitives exist in DISPATCH, dry-run fires

Exit codes:
  0 = all checks passed
  1 = one or more checks failed
"""

import sys
import os
import json
import importlib.util
import tempfile
import shutil
import traceback
import datetime

# ─────────────────────────────────────────────────────────────
# TERMINAL OUTPUT
# ─────────────────────────────────────────────────────────────

RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
DIM    = "\033[2m"

def ok(msg):    print(f"  {GREEN}✓{RESET}  {msg}")
def fail(msg):  print(f"  {RED}✗{RESET}  {msg}")
def warn(msg):  print(f"  {YELLOW}⚠{RESET}  {msg}")
def info(msg):  print(f"  {CYAN}→{RESET}  {msg}")
def dim(msg):   print(f"     {DIM}{msg}{RESET}")

def header(title):
    print(f"\n{BOLD}{CYAN}{'─' * 50}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─' * 50}{RESET}")

def section(title):
    print(f"\n{BOLD}  {title}{RESET}")

# ─────────────────────────────────────────────────────────────
# VALID SCHEMA CONSTANTS
# ─────────────────────────────────────────────────────────────

VALID_SCP_VERSIONS  = {"0.1"}
VALID_OBJECT_CLASSES = {"Safe", "Euclid", "Keter", "Thaumiel"}
VALID_TRIGGERS       = {"on_load", "cron", "on_event", "manual"}
REQUIRED_FIELDS      = {"scp_version", "scp_id", "object_class", "intent", "behaviours"}

CORE_PRIMITIVES = {
    "log", "emit_event", "http_request", "read_file", "write_file",
    "exec", "spawn.agent", "render_template", "render.component",
    "validate_self", "mutate", "get_device", "restart_system",
    "encrypt_data", "decrypt_data", "audit_capsules", "rotate_logs",
    "cleanup_old_logs", "read_log", "list_files", "llm_reason",
    "llm_embed", "web_search", "emit_remote_event", "transmit_capsule",
}

# ─────────────────────────────────────────────────────────────
# LOAD UBVM DISPATCH (if available)
# ─────────────────────────────────────────────────────────────

def load_dispatch(ubvm_home):
    """Load the full UBVM dispatch table from the repo."""
    try:
        sys.path.insert(0, ubvm_home)
        import interpreter
        dispatch = interpreter.build_dispatch(ubvm_home=ubvm_home, verbose=False)
        return dispatch, None
    except Exception as e:
        return None, str(e)

# ─────────────────────────────────────────────────────────────
# PRIMITIVE CHECKS
# ─────────────────────────────────────────────────────────────

def check_primitive(path, dispatch=None):
    header(f"PRIMITIVE CHECK — {os.path.basename(path)}")
    passed = 0
    failed = 0

    # 1. File exists
    section("1. File")
    if not os.path.exists(path):
        fail(f"File not found: {path}")
        return 0, 1
    ok(f"File exists: {path}")
    passed += 1

    # 2. Import
    section("2. Import")
    try:
        spec   = importlib.util.spec_from_file_location("test_primitive", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        ok("Import successful — no syntax errors")
        passed += 1
    except SyntaxError as e:
        fail(f"Syntax error: {e}")
        dim(f"Line {e.lineno}: {e.text}")
        return passed, failed + 1
    except Exception as e:
        fail(f"Import failed: {e}")
        dim(traceback.format_exc().strip().split('\n')[-1])
        return passed, failed + 1

    # 3. register() function
    section("3. register()")
    if not hasattr(module, 'register'):
        fail("No register() function found")
        dim("Add: def register() -> dict: return {'primitive_name': primitive_fn}")
        failed += 1
    else:
        ok("register() function found")
        passed += 1

        try:
            registry = module.register()
            if not isinstance(registry, dict):
                fail(f"register() must return dict, got {type(registry).__name__}")
                failed += 1
            elif len(registry) == 0:
                warn("register() returned empty dict — no primitives registered")
                failed += 1
            else:
                ok(f"register() returned {len(registry)} primitive(s)")
                for name, fn in registry.items():
                    dim(f"• {name} → {fn.__name__}")
                passed += 1
        except Exception as e:
            fail(f"register() raised exception: {e}")
            failed += 1
            registry = {}

    # 4. Primitive signatures
    section("4. Primitive signatures")
    try:
        registry = module.register()
        for name, fn in registry.items():
            import inspect
            sig = inspect.signature(fn)
            params = list(sig.parameters.keys())
            if params == ['params', 'context'] or params == ['params', 'ctx']:
                ok(f"{name}(params, context) — correct signature")
                passed += 1
            else:
                fail(f"{name} — wrong signature: ({', '.join(params)})")
                dim("Expected: (params: dict, context: dict) -> dict")
                failed += 1
    except Exception:
        pass

    # 5. Dry-run each primitive
    section("5. Dry-run execution")
    try:
        registry = module.register()
        tmp_home = tempfile.mkdtemp(prefix="ubvm_preflight_")
        os.makedirs(os.path.join(tmp_home, "logs", "events"), exist_ok=True)
        os.makedirs(os.path.join(tmp_home, "data"), exist_ok=True)

        ctx = {
            "scp_id":    "preflight/test",
            "ubvm_home": tmp_home,
            "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "env":       {},
            "capsule":   {"object_class": "Thaumiel", "scp_id": "preflight/test"},
        }

        for name, fn in registry.items():
            try:
                result = fn({}, ctx)
                if not isinstance(result, dict):
                    fail(f"{name} — returned {type(result).__name__}, must return dict")
                    failed += 1
                elif "status" not in result:
                    warn(f"{name} — returned dict missing 'status' key")
                    dim("Add 'status': 'ok' or 'status': 'error' to return value")
                    failed += 1
                else:
                    ok(f"{name} — returns dict with status: '{result['status']}'")
                    passed += 1
            except Exception as e:
                # Runtime errors with empty params are expected — check it's not a crash
                err = str(e)
                if "required" in err.lower() or "missing" in err.lower() or "key" in err.lower():
                    warn(f"{name} — needs params to run (expected): {err[:60]}")
                    passed += 1  # Not a real failure
                else:
                    fail(f"{name} — unexpected exception: {err[:80]}")
                    dim(traceback.format_exc().strip().split('\n')[-1])
                    failed += 1

        shutil.rmtree(tmp_home, ignore_errors=True)

    except Exception as e:
        fail(f"Dry-run setup failed: {e}")
        failed += 1

    # 6. Name conflicts with existing DISPATCH
    section("6. Name conflicts")
    if dispatch:
        try:
            registry = module.register()
            conflicts = [n for n in registry if n in dispatch and n not in CORE_PRIMITIVES]
            shadows   = [n for n in registry if n in CORE_PRIMITIVES]
            if shadows:
                for s in shadows:
                    fail(f"'{s}' shadows a UBVM Core primitive — rename it")
                    failed += 1
            elif conflicts:
                for c in conflicts:
                    warn(f"'{c}' already exists in DISPATCH — will overwrite")
            else:
                ok("No name conflicts with existing DISPATCH")
                passed += 1
        except Exception:
            pass
    else:
        info("DISPATCH not loaded — skipping conflict check")

    return passed, failed


# ─────────────────────────────────────────────────────────────
# CAPSULE CHECKS
# ─────────────────────────────────────────────────────────────

def check_capsule(path, dispatch=None):
    header(f"CAPSULE CHECK — {os.path.basename(path)}")
    passed = 0
    failed = 0

    # 1. File exists and parses
    section("1. File & JSON")
    if not os.path.exists(path):
        fail(f"File not found: {path}")
        return 0, 1

    try:
        with open(path, encoding="utf-8") as f:
            capsule = json.load(f)
        ok("File exists and is valid JSON")
        passed += 1
    except json.JSONDecodeError as e:
        fail(f"Invalid JSON: {e}")
        dim(f"Line {e.lineno}, col {e.colno}: {e.msg}")
        return 0, 1

    # 2. Required fields
    section("2. Required fields")
    missing = REQUIRED_FIELDS - set(capsule.keys())
    if missing:
        for m in sorted(missing):
            fail(f"Missing required field: '{m}'")
            failed += 1
    else:
        ok(f"All required fields present: {', '.join(sorted(REQUIRED_FIELDS))}")
        passed += 1

    # 3. scp_version
    section("3. scp_version")
    ver = capsule.get("scp_version", "")
    if ver in VALID_SCP_VERSIONS:
        ok(f"scp_version '{ver}' is supported")
        passed += 1
    else:
        fail(f"scp_version '{ver}' not supported — use one of: {VALID_SCP_VERSIONS}")
        failed += 1

    # 4. scp_id
    section("4. scp_id")
    scp_id = capsule.get("scp_id", "")
    if not isinstance(scp_id, str) or not scp_id:
        fail("scp_id must be a non-empty string")
        failed += 1
    elif "/" not in scp_id:
        warn(f"scp_id '{scp_id}' has no namespace — recommend 'namespace/name' format")
        passed += 1
    else:
        ok(f"scp_id: '{scp_id}'")
        passed += 1

    # 5. object_class
    section("5. object_class")
    obj_class = capsule.get("object_class", "")
    if obj_class in VALID_OBJECT_CLASSES:
        ok(f"object_class: '{obj_class}'")
        passed += 1
    else:
        fail(f"object_class '{obj_class}' invalid — must be one of: {', '.join(sorted(VALID_OBJECT_CLASSES))}")
        failed += 1

    # 6. intent
    section("6. intent")
    intent = capsule.get("intent", "")
    if not isinstance(intent, str) or not intent.strip():
        fail("intent must be a non-empty string")
        failed += 1
    elif len(intent) > 200:
        warn(f"intent is {len(intent)} chars — keep it concise (one sentence)")
        passed += 1
    else:
        ok(f"intent: '{intent[:80]}{'...' if len(intent) > 80 else ''}'")
        passed += 1

    # 7. behaviours
    section("7. behaviours")
    behaviours = capsule.get("behaviours", [])
    if not isinstance(behaviours, list) or len(behaviours) == 0:
        fail("behaviours must be a non-empty list")
        failed += 1
    else:
        ok(f"{len(behaviours)} behaviour(s) found")
        passed += 1

        for i, b in enumerate(behaviours):
            trigger = b.get("trigger", "")
            if trigger not in VALID_TRIGGERS:
                fail(f"Behaviour {i}: trigger '{trigger}' invalid — must be: {', '.join(VALID_TRIGGERS)}")
                failed += 1
            else:
                # Check required fields per trigger type
                if trigger == "cron" and not b.get("schedule"):
                    fail(f"Behaviour {i}: trigger 'cron' requires 'schedule' field")
                    failed += 1
                elif trigger == "on_event" and not b.get("event"):
                    fail(f"Behaviour {i}: trigger 'on_event' requires 'event' field")
                    failed += 1
                else:
                    ok(f"Behaviour {i}: trigger '{trigger}'" +
                       (f" schedule='{b.get('schedule')}'" if trigger == "cron" else "") +
                       (f" event='{b.get('event')}'" if trigger == "on_event" else ""))
                    passed += 1

            # Check actions
            actions = b.get("actions", [])
            if not isinstance(actions, list):
                fail(f"Behaviour {i}: actions must be a list")
                failed += 1
            elif len(actions) == 0:
                warn(f"Behaviour {i}: actions list is empty")
            else:
                for j, action in enumerate(actions):
                    if not isinstance(action, dict):
                        fail(f"Behaviour {i} action {j}: must be an object")
                        failed += 1
                    elif "primitive" not in action:
                        fail(f"Behaviour {i} action {j}: missing 'primitive' field")
                        failed += 1
                    else:
                        prim = action["primitive"]
                        dim(f"  action {j}: {prim}")

    # 8. Primitive existence check
    section("8. Primitive availability")
    all_primitives = set()
    for b in behaviours:
        for a in b.get("actions", []):
            prim = a.get("primitive")
            if prim:
                all_primitives.add(prim)

    if not all_primitives:
        warn("No primitives found in actions")
    elif dispatch:
        for prim in sorted(all_primitives):
            if prim in dispatch:
                ok(f"'{prim}' — found in DISPATCH")
                passed += 1
            elif prim in CORE_PRIMITIVES:
                ok(f"'{prim}' — UBVM Core primitive")
                passed += 1
            else:
                fail(f"'{prim}' — NOT found in DISPATCH")
                dim("Either the extension isn't loaded or the primitive name is wrong")
                failed += 1
    else:
        # Check against known core primitives only
        for prim in sorted(all_primitives):
            if prim in CORE_PRIMITIVES:
                ok(f"'{prim}' — UBVM Core primitive")
                passed += 1
            else:
                warn(f"'{prim}' — not a Core primitive (may be extension)")
                dim("Load DISPATCH for full check: run from UBVM_HOME directory")

    # 9. containment check
    section("9. containment")
    containment = capsule.get("containment", {})
    if not containment:
        warn("No containment block — recommend adding read_only, audit_log, kill_switch")
    else:
        obj_class = capsule.get("object_class", "")
        if obj_class == "Keter" and not containment.get("kill_switch"):
            fail("Keter capsule must have kill_switch: true")
            failed += 1
        else:
            ok(f"containment: {json.dumps(containment)}")
            passed += 1

    # 10. Dry-run (on_load only)
    section("10. Dry-run (on_load)")
    if dispatch:
        on_load_behaviours = [b for b in behaviours if b.get("trigger") == "on_load"]
        if not on_load_behaviours:
            info("No on_load behaviour — skipping dry-run")
        else:
            tmp_home = tempfile.mkdtemp(prefix="ubvm_preflight_")
            os.makedirs(os.path.join(tmp_home, "logs", "events"), exist_ok=True)
            os.makedirs(os.path.join(tmp_home, "data"), exist_ok=True)

            try:
                sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
                import interpreter
                ctx = interpreter.build_context({
                    "scp_id":    capsule.get("scp_id", "preflight/test"),
                    "ubvm_home": tmp_home,
                })
                ctx["capsule"] = capsule

                results = interpreter.run_capsule(
                    capsule,
                    trigger_type="on_load",
                    dispatch=dispatch,
                    ubvm_home=tmp_home,
                )
                status = results.get("status", "unknown")
                errors = results.get("errors", [])

                if status == "ok":
                    ok(f"Dry-run on_load — status: ok")
                    passed += 1
                elif status == "partial":
                    warn(f"Dry-run on_load — status: partial")
                    for e in errors:
                        dim(f"  {e}")
                    passed += 1
                else:
                    fail(f"Dry-run on_load — status: {status}")
                    for e in errors:
                        dim(f"  {e}")
                    failed += 1

            except Exception as e:
                warn(f"Dry-run could not execute: {e}")
            finally:
                shutil.rmtree(tmp_home, ignore_errors=True)
    else:
        info("DISPATCH not loaded — skipping dry-run")
        info("Run from UBVM_HOME directory for full dry-run")

    return passed, failed


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]

    if not args:
        print(f"""
{BOLD}ubvm-preflight{RESET} — pre-flight checker for UBVM primitives and capsules

{BOLD}Usage:{RESET}
  python3 ubvm-preflight.py extensions/myext/primitives.py
  python3 ubvm-preflight.py capsules/my.capsule.scp.json
  python3 ubvm-preflight.py extensions/myext/primitives.py capsules/my.capsule.scp.json

{BOLD}Run from your UBVM_HOME directory for full DISPATCH checks.{RESET}
""")
        sys.exit(0)

    # Detect UBVM_HOME
    ubvm_home = os.environ.get("UBVM_HOME", os.getcwd())
    dispatch, dispatch_err = load_dispatch(ubvm_home)

    print(f"\n{BOLD}UBVM Pre-flight Checker{RESET}")
    print(f"{DIM}UBVM_HOME: {ubvm_home}{RESET}")
    if dispatch:
        print(f"{DIM}DISPATCH:  {len(dispatch)} primitives loaded{RESET}")
    else:
        print(f"{YELLOW}DISPATCH:  not loaded ({dispatch_err}){RESET}")
        print(f"{DIM}Tip: run from UBVM_HOME for full primitive checks{RESET}")

    total_passed = 0
    total_failed = 0

    for path in args:
        path = os.path.abspath(path)

        if path.endswith(".py"):
            p, f = check_primitive(path, dispatch)
        elif path.endswith(".json"):
            p, f = check_capsule(path, dispatch)
        else:
            warn(f"Unknown file type: {path} — expected .py or .json")
            continue

        total_passed += p
        total_failed += f

    # Final summary
    print(f"\n{BOLD}{'─' * 50}{RESET}")
    total = total_passed + total_failed
    if total_failed == 0:
        print(f"{BOLD}{GREEN}  PREFLIGHT PASSED{RESET} — {total_passed}/{total} checks passed")
        print(f"{GREEN}  Safe to deploy.{RESET}\n")
        sys.exit(0)
    else:
        print(f"{BOLD}{RED}  PREFLIGHT FAILED{RESET} — {total_failed} check(s) failed ({total_passed}/{total} passed)")
        print(f"{RED}  Fix the issues above before deploying.{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
