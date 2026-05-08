#!/usr/bin/env python3
"""
UBVM scheduler_daemon.py
Generic cron scanner + event daemon with persistent cursor.
Version: 0.2
Author: James / Giblets Creations

Two loops in one process:
  - Cron loop: evaluates all capsules with trigger:cron every 60 seconds
  - Event loop: tails queue.jsonl, matches events to on_event capsules
"""

import os
import sys
import json
import time
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from interpreter import load_all_capsules, run_capsule, build_dispatch, UBVM_VERSION


# ─────────────────────────────────────────────────────────────
# CRON HELPERS
# ─────────────────────────────────────────────────────────────

def cron_matches(schedule: str, now: datetime.datetime) -> bool:
    """
    Minimal 5-field cron evaluator.
    Fields: minute hour day_of_month month day_of_week
    Supports: * and exact integers only (no ranges/steps for v0.1).
    """
    try:
        fields = schedule.strip().split()
        if len(fields) != 5:
            return False

        minute, hour, dom, month, dow = fields

        def field_match(field, value):
            if field == "*":
                return True
            try:
                return int(field) == value
            except ValueError:
                return False

        return (
            field_match(minute, now.minute) and
            field_match(hour,   now.hour)   and
            field_match(dom,    now.day)     and
            field_match(month,  now.month)   and
            field_match(dow,    now.weekday())
        )
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────
# EVENT CURSOR
# ─────────────────────────────────────────────────────────────

def read_cursor(cursor_path: str) -> int:
    """Read byte offset from cursor file. Returns 0 if not found."""
    try:
        with open(cursor_path, "r") as f:
            return int(f.read().strip())
    except Exception:
        return 0


def write_cursor(cursor_path: str, offset: int):
    """Write byte offset to cursor file."""
    with open(cursor_path, "w") as f:
        f.write(str(offset))


# ─────────────────────────────────────────────────────────────
# EVENT LOOP
# ─────────────────────────────────────────────────────────────

def process_events(queue_path: str, cursor_path: str, capsules: list, dispatch: dict = None, seen_events: dict = None) -> int:
    """
    Read new events from queue.jsonl since last cursor position.
    Match each event to capsules with trigger:on_event.
    Returns new cursor offset.
    """
    if not os.path.exists(queue_path):
        return read_cursor(cursor_path)

    offset = read_cursor(cursor_path)

    with open(queue_path, "r") as f:
        f.seek(offset)
        new_lines = f.readlines()
        new_offset = f.tell()

    if not new_lines:
        return offset

    for line in new_lines:
        line = line.strip()
        if not line:
            continue

        # Parse event — skip malformed lines without halting
        try:
            event_obj = json.loads(line)
        except json.JSONDecodeError:
            print(f"[WARN] Malformed event line skipped: {line[:80]}")
            continue

        event_name = event_obj.get("event")
        event_payload = event_obj.get("payload", {})
        if not event_name:
            continue

        if seen_events is not None:
            now_ts = datetime.datetime.utcnow().timestamp()
            if now_ts - seen_events.get(event_name, 0) < 30:
                continue
            seen_events[event_name] = now_ts

        ts = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        print(f"[{ts}] [EVENT] Received: {event_name}")

        # Match against all on_event capsules
        for path, capsule in capsules:
            scp_id = capsule.get("scp_id", path)
            for behaviour in capsule.get("behaviours", []):
                if behaviour.get("trigger") == "on_event" and (
                   behaviour.get("event") == event_name or behaviour.get("event") == "*"):
                    print(f"[{ts}] [EVENT] Triggering: {scp_id}")
                    try:
                        result = run_capsule(
                            capsule,
                            trigger_type="on_event",
                            event_name=event_name,
                            event_payload=event_payload,
                            dispatch=dispatch
                        )
                        if result["status"] == "error":
                            err_log = os.path.join(
                                os.environ.get("UBVM_HOME", "."),
                                "logs", "errors.log"
                            )
                            with open(err_log, "a") as ef:
                                ef.write(json.dumps({
                                    "ts":     ts,
                                    "event":  event_name,
                                    "capsule": scp_id,
                                    "errors": result["errors"]
                                }) + "\n")
                    except Exception as e:
                        print(f"[ERROR] Exception running {scp_id}: {e}")

    write_cursor(cursor_path, new_offset)
    return new_offset


# ─────────────────────────────────────────────────────────────
# MAIN DAEMON LOOP
# ─────────────────────────────────────────────────────────────

def run_daemon(ubvm_home: str = None):
    if ubvm_home is None:
        ubvm_home = os.environ.get(
            "UBVM_HOME",
            os.path.dirname(os.path.abspath(__file__))
        )

    # Always resolve to absolute path
    ubvm_home = os.path.abspath(ubvm_home)
    os.environ["UBVM_HOME"] = ubvm_home

    capsules_dir = os.path.join(ubvm_home, "capsules")
    queue_path   = os.path.join(ubvm_home, "logs", "events", "queue.jsonl")
    cursor_path  = os.path.join(ubvm_home, "logs", "events", ".cursor")
    errors_log   = os.path.join(ubvm_home, "logs", "errors.log")

    # Ensure dirs exist
    os.makedirs(os.path.join(ubvm_home, "logs", "events"), exist_ok=True)

    print(f"UBVM v{UBVM_VERSION} — scheduler daemon started")
    print(f"UBVM_HOME:   {ubvm_home}")
    print(f"Capsules:    {capsules_dir}")
    print(f"Event queue: {queue_path}")
    print("-" * 60)

    last_cron_minute = -1
    seen_events = {}

    while True:
        # Reload capsules on each tick — picks up new capsules without restart
        capsules = load_all_capsules(capsules_dir)
        dispatch = build_dispatch(ubvm_home=ubvm_home, verbose=False)

        now = datetime.datetime.utcnow()

        # ── Cron loop (once per minute) ──────────────────────
        if now.minute != last_cron_minute:
            last_cron_minute = now.minute
            fired_this_minute = set()
            for path, capsule in capsules:
                scp_id = capsule.get("scp_id", path)
                for behaviour in capsule.get("behaviours", []):
                    if behaviour.get("trigger") != "cron":
                        continue
                    schedule = behaviour.get("schedule", "")
                    if cron_matches(schedule, now) and scp_id not in fired_this_minute:
                        fired_this_minute.add(scp_id)
                        ts = now.strftime("%Y-%m-%dT%H:%M:%SZ")
                        print(f"[{ts}] [CRON] Triggering: {scp_id} ({schedule})")
                        try:
                            result = run_capsule(capsule, trigger_type="cron", dispatch=dispatch)
                            if result["status"] == "error":
                                with open(errors_log, "a") as ef:
                                    ef.write(json.dumps({
                                        "ts":      ts,
                                        "trigger": "cron",
                                        "capsule": scp_id,
                                        "errors":  result["errors"]
                                    }) + "\n")
                        except Exception as e:
                            print(f"[ERROR] Exception running {scp_id}: {e}")

        # ── Event loop ───────────────────────────────────────
        process_events(queue_path, cursor_path, capsules, dispatch, seen_events)

        time.sleep(2)  # Poll every 2 seconds


if __name__ == "__main__":
    run_daemon()
