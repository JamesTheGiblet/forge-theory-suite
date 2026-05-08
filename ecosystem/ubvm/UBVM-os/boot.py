#!/usr/bin/env python3
"""
UBVM boot.py
Boot sequence — scans all capsules in capsules/ and runs on_load behaviours.
Version: 0.2
Author: James / Giblets Creations
"""

import os
import sys
import json

# Allow running from any directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from interpreter import load_all_capsules, run_capsule, build_dispatch, UBVM_VERSION

def boot(ubvm_home: str = None):
    if ubvm_home is None:
        ubvm_home = os.environ.get(
            "UBVM_HOME",
            os.path.dirname(os.path.abspath(__file__))
        )

    # Always resolve to absolute path
    ubvm_home = os.path.abspath(ubvm_home)
    os.environ["UBVM_HOME"] = ubvm_home

    print(f"UBVM v{UBVM_VERSION} — boot sequence started")
    print(f"UBVM_HOME: {ubvm_home}")
    print("-" * 60)

    # Ensure required directories exist
    for subdir in [
        "capsules", "logs", "logs/events", "data", "results",
        "strategies/raw", "strategies/selected", "strategies/mutated", "anchors"
    ]:
        path = os.path.join(ubvm_home, subdir)
        os.makedirs(path, exist_ok=True)

    # Load all capsules
    capsules_dir = os.path.join(ubvm_home, "capsules")
    capsules     = load_all_capsules(capsules_dir, recursive=True)
    dispatch = build_dispatch(ubvm_home=ubvm_home)

    if not capsules:
        print(f"No capsules found in {capsules_dir}")
        return

    print(f"Found {len(capsules)} capsule(s)")
    print()

    ok_count      = 0
    error_count   = 0
    skipped_count = 0

    for path, capsule in capsules:
        scp_id = capsule.get("scp_id", os.path.basename(path))

        # Check if capsule has any on_load behaviours
        has_on_load = any(
            b.get("trigger") == "on_load"
            for b in capsule.get("behaviours", [])
        )

        if not has_on_load:
            skipped_count += 1
            continue

        print(f"  → {scp_id}")
        result = run_capsule(capsule, trigger_type="on_load", dispatch=dispatch)

        if result["status"] == "ok":
            ok_count += 1
        elif result["status"] == "partial":
            ok_count += 1
            print(f"    [PARTIAL] {result['errors']}")
        else:
            error_count += 1
            print(f"    [ERROR] {result['errors']}")

    print()
    print("-" * 60)
    print(f"Boot complete — {ok_count} ok, {error_count} errors, {skipped_count} skipped")


if __name__ == "__main__":
    boot()
