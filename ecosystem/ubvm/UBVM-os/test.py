#!/usr/bin/env python3
"""
UBVM test.py
Stub for the UBVM compliance test suite (Phase 0).
Runs fixture capsules to validate core interpreter behaviour.
"""

import os
import sys
import json
import tempfile
import datetime
from interpreter import load_capsule, run_capsule, build_dispatch, primitive_emit_event
import scheduler_daemon

def run_tests():
    print("============================================================")
    print(" UBVM Compliance Test Suite — Phase 0 Gate")
    print("============================================================")

    ubvm_home = os.environ.get("UBVM_HOME", os.path.dirname(os.path.abspath(__file__)))
    fixtures_dir = os.path.join(ubvm_home, "capsules", "fixtures")

    if not os.path.exists(fixtures_dir):
        print(f"[ERROR] Fixtures directory not found: {fixtures_dir}")
        sys.exit(1)

    dispatch = build_dispatch(ubvm_home, verbose=False)
    passed = 0
    failed = 0

    # --- Test Category 15.1: Capsule Validation ---
    print("\n[TEST] 15.1 Capsule Validation")

    cap_missing_id = {
        "scp_version": "0.1", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": []}]
    }
    res = run_capsule(cap_missing_id, dispatch=dispatch)
    if res["status"] == "error" and any("scp_id" in e for e in res["errors"]):
        print("  ✅ Passed: Missing scp_id -> reject")
        passed += 1
    else:
        print(f"  ❌ Failed: Missing scp_id. Result: {res['errors']}")
        failed += 1

    cap_missing_beh = {
        "scp_version": "0.1", "scp_id": "test/missing-beh", "object_class": "Safe", "intent": "test"
    }
    res = run_capsule(cap_missing_beh, dispatch=dispatch)
    if res["status"] == "error" and any("behaviours" in e for e in res["errors"]):
        print("  ✅ Passed: Missing behaviours -> reject")
        passed += 1
    else:
        print(f"  ❌ Failed: Missing behaviours. Result: {res['errors']}")
        failed += 1

    cap_bad_version = {"scp_version": "9.9", "scp_id": "test/bad-version"}
    res = run_capsule(cap_bad_version, dispatch=dispatch)
    if res["status"] == "error" and any("scp_version" in e for e in res["errors"]):
        print("  ✅ Passed: Unsupported scp_version -> reject")
        passed += 1
    else:
        print(f"  ❌ Failed: Unsupported scp_version. Result: {res['errors']}")
        failed += 1

    cap_bad_trigger = {
        "scp_version": "0.1", "scp_id": "test/bad-trigger", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "invalid_trigger", "actions": []}]
    }
    res = run_capsule(cap_bad_trigger, dispatch=dispatch)
    if res["status"] == "error" and any("Invalid trigger" in e for e in res["errors"]):
        print("  ✅ Passed: Invalid trigger type -> reject")
        passed += 1
    else:
        print(f"  ❌ Failed: Invalid trigger type. Result: {res['errors']}")
        failed += 1

    # --- Test Category 15.2: Primitive Dispatch ---
    print("\n[TEST] 15.2 Primitive Dispatch")

    def dummy_success(params, context):
        return {"status": "ok"}

    def dummy_exception(params, context):
        raise ValueError("Intentional exception")

    test_dispatch = dict(dispatch)
    test_dispatch["dummy_success"] = dummy_success
    test_dispatch["dummy_exception"] = dummy_exception

    cap_known = {
        "scp_version": "0.1", "scp_id": "test/known-prim", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": [{"primitive": "dummy_success"}]}]
    }
    res = run_capsule(cap_known, dispatch=test_dispatch)
    if res["status"] == "ok" and len(res["results"]) == 1:
        print("  ✅ Passed: Known primitive executes successfully")
        passed += 1
    else:
        print(f"  ❌ Failed: Known primitive. Result: {res}")
        failed += 1

    cap_unknown_halt = {
        "scp_version": "0.1", "scp_id": "test/unknown-prim", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": [{"primitive": "unknown_prim"}, {"primitive": "dummy_success"}]}]
    }
    res = run_capsule(cap_unknown_halt, dispatch=test_dispatch)
    if res["status"] == "partial" and len(res["results"]) == 1 and len(res["errors"]) == 1 and any("Unknown primitive" in e for e in res["errors"]):
        print("  ✅ Passed: Unknown primitive errors but does not halt capsule")
        passed += 1
    else:
        print(f"  ❌ Failed: Unknown primitive. Result: {res}")
        failed += 1

    cap_exception = {
        "scp_version": "0.1", "scp_id": "test/exception-prim", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": [{"primitive": "dummy_exception"}]}]
    }
    res = run_capsule(cap_exception, dispatch=test_dispatch)
    if res["status"] == "error" and len(res["errors"]) == 1 and any("Intentional exception" in e for e in res["errors"]):
        print("  ✅ Passed: Primitive exceptions caught into errors[]")
        passed += 1
    else:
        print(f"  ❌ Failed: Primitive exception. Result: {res}")
        failed += 1

    # --- Test Category 15.3: Trigger Tests ---
    print("\n[TEST] 15.3 Trigger Tests")

    cap_triggers = {
        "scp_version": "0.1", "scp_id": "test/triggers", "object_class": "Safe", "intent": "test",
        "behaviours": [
            {"trigger": "on_load", "actions": [{"primitive": "dummy_success"}]},
            {"trigger": "cron", "schedule": "0 12 * * *", "actions": [{"primitive": "dummy_success"}]},
            {"trigger": "on_event", "event": "my.event", "actions": [{"primitive": "dummy_success"}]}
        ]
    }

    res_load = run_capsule(cap_triggers, trigger_type="on_load", dispatch=test_dispatch)
    if res_load["status"] == "ok" and len(res_load["results"]) == 1:
        print("  ✅ Passed: on_load executes exactly once per boot")
        passed += 1
    else:
        print(f"  ❌ Failed: on_load trigger. Result: {res_load}")
        failed += 1

    dt_match = datetime.datetime(2026, 5, 5, 12, 0)
    dt_nomatch = datetime.datetime(2026, 5, 5, 13, 0)
    if scheduler_daemon.cron_matches("0 12 * * *", dt_match) and not scheduler_daemon.cron_matches("0 12 * * *", dt_nomatch):
        print("  ✅ Passed: cron executes on correct schedule (mock clock)")
        passed += 1
    else:
        print("  ❌ Failed: cron executes on correct schedule")
        failed += 1

    res_event_match = run_capsule(cap_triggers, trigger_type="on_event", event_name="my.event", dispatch=test_dispatch)
    res_event_nomatch = run_capsule(cap_triggers, trigger_type="on_event", event_name="other.event", dispatch=test_dispatch)
    if res_event_match["status"] == "ok" and len(res_event_match["results"]) == 1 and len(res_event_nomatch["results"]) == 0:
        print("  ✅ Passed: on_event fires only on matching event name")
        passed += 1
    else:
        print("  ❌ Failed: on_event trigger")
        failed += 1

    # --- Test Category 15.4: Event Bus Tests ---
    print("\n[TEST] 15.4 Event Bus Tests")

    with tempfile.TemporaryDirectory() as tmpdir:
        ctx = {"ubvm_home": tmpdir, "scp_id": "test", "timestamp": "2026-05-05T12:00:00Z"}
        queue_path = os.path.join(tmpdir, "logs", "events", "queue.jsonl")
        cursor_path = os.path.join(tmpdir, "logs", "events", ".cursor")

        primitive_emit_event({"event": "event1"}, ctx)
        primitive_emit_event({"event": "event2"}, ctx)

        if os.path.exists(queue_path):
            with open(queue_path, "r") as f:
                lines = f.readlines()
            if len(lines) == 2 and json.loads(lines[0])["event"] == "event1":
                print("  ✅ Passed: Events append correctly to queue.jsonl")
                passed += 1
            else:
                print("  ❌ Failed: Events append correctly")
                failed += 1
        else:
            print("  ❌ Failed: queue.jsonl not created")
            failed += 1

        scheduler_daemon.write_cursor(cursor_path, 42)
        if scheduler_daemon.read_cursor(cursor_path) == 42:
            print("  ✅ Passed: Cursor persists across daemon restarts")
            passed += 1
        else:
            print("  ❌ Failed: Cursor persists")
            failed += 1

        with open(queue_path, "w") as f:
            f.write(json.dumps({"event": "e1", "payload": {}}) + "\n")
            f.write("not a json object\n")
            f.write(json.dumps({"event": "e2", "payload": {}}) + "\n")

        scheduler_daemon.write_cursor(cursor_path, 0)

        processed_events = []
        def dummy_run_capsule(capsule, trigger_type, event_name, event_payload, dispatch):
            processed_events.append(event_name)
            return {"status": "ok", "errors": []}

        orig_run_capsule = scheduler_daemon.run_capsule
        scheduler_daemon.run_capsule = dummy_run_capsule

        dummy_capsules = [("path", {"scp_id": "test", "behaviours": [{"trigger": "on_event", "event": "e1"}, {"trigger": "on_event", "event": "e2"}]})]

        try:
            scheduler_daemon.process_events(queue_path, cursor_path, dummy_capsules, dispatch=test_dispatch, seen_events={})
            if processed_events == ["e1", "e2"]:
                print("  ✅ Passed: Events processed in written order")
                passed += 1
                print("  ✅ Passed: Malformed event lines skipped without halt")
                passed += 1
            else:
                print(f"  ❌ Failed: Event processing order or malformed skipping. Got: {processed_events}")
                failed += 1
                failed += 1
        finally:
            scheduler_daemon.run_capsule = orig_run_capsule

    # --- Test Category 15.5: Result Object Tests ---
    print("\n[TEST] 15.5 Result Object Tests")

    def dummy_emit_event(params, context):
        return {"status": "ok", "event": params.get("event")}
    test_dispatch["emit_event"] = dummy_emit_event

    cap_ok = {
        "scp_version": "0.1", "scp_id": "test/ok", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": [{"primitive": "dummy_success"}, {"primitive": "dummy_success"}]}]
    }
    res_ok = run_capsule(cap_ok, dispatch=test_dispatch)
    if res_ok["status"] == "ok" and len(res_ok["results"]) == 2 and len(res_ok["errors"]) == 0:
        print("  ✅ Passed: status: ok when all actions succeed")
        print("  ✅ Passed: results[] contains one entry per success")
        passed += 2
    else:
        print(f"  ❌ Failed: status: ok tests. Result: {res_ok}")
        failed += 2

    cap_error = {
        "scp_version": "0.1", "scp_id": "test/error", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": [{"primitive": "dummy_exception"}, {"primitive": "dummy_exception"}]}]
    }
    res_error = run_capsule(cap_error, dispatch=test_dispatch)
    if res_error["status"] == "error" and len(res_error["results"]) == 0 and len(res_error["errors"]) == 2:
        print("  ✅ Passed: status: error when all actions fail")
        print("  ✅ Passed: errors[] contains one entry per failure")
        passed += 2
    else:
        print(f"  ❌ Failed: status: error tests. Result: {res_error}")
        failed += 2

    cap_partial = {
        "scp_version": "0.1", "scp_id": "test/partial", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": [{"primitive": "dummy_success"}, {"primitive": "dummy_exception"}]}]
    }
    res_partial = run_capsule(cap_partial, dispatch=test_dispatch)
    if res_partial["status"] == "partial" and len(res_partial["results"]) == 1 and len(res_partial["errors"]) == 1:
        print("  ✅ Passed: status: partial when some fail")
        passed += 1
    else:
        print(f"  ❌ Failed: status: partial tests. Result: {res_partial}")
        failed += 1

    cap_events = {
        "scp_version": "0.1", "scp_id": "test/events", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": [{"primitive": "emit_event", "params": {"event": "evt1"}}, {"primitive": "emit_event", "params": {"event": "evt2"}}]}]
    }
    res_events = run_capsule(cap_events, dispatch=test_dispatch)
    if res_events["status"] == "ok" and res_events["events"] == ["evt1", "evt2"]:
        print("  ✅ Passed: events[] contains all emitted events")
        passed += 1
    else:
        print(f"  ❌ Failed: events[] tests. Result: {res_events}")
        failed += 1

    # --- Test Category 15.6: Device Bridge Tests ---
    print("\n[TEST] 15.6 Device Bridge Tests")

    cap_device = {
        "scp_version": "0.1", "scp_id": "test/device-bridge", "object_class": "Safe", "intent": "test",
        "behaviours": [{"trigger": "on_load", "actions": [{"primitive": "get_device"}]}]
    }
    res_device = run_capsule(cap_device, dispatch=test_dispatch)
    if res_device["status"] == "ok" and len(res_device["results"]) == 1:
        dev_res = res_device["results"][0]["result"]
        if dev_res.get("status") == "ok" and "device" in dev_res and "node_id" in dev_res:
            print("  ✅ Passed: get_device correctly returns context-injected UBVM_DEVICE and UBVM_NODE_ID")
            passed += 1
        else:
            print(f"  ❌ Failed: get_device missing fields. Result: {dev_res}")
            failed += 1
    else:
        print(f"  ❌ Failed: get_device execution. Result: {res_device}")
        failed += 1

    print("\n============================================================")
    print(f" Tests Complete: {passed} passed, {failed} failed")
    print("============================================================")
    sys.exit(1 if failed > 0 else 0)

if __name__ == "__main__":
    run_tests()