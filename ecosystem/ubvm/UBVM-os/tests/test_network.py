#!/usr/bin/env python3
"""
UBVM Network Test Script
A single-file test to verify connectivity and transport between UBVM nodes.
"""
import sys
import json
import zlib
import urllib.request
import datetime
from urllib.error import URLError

def run_tests(target_ip, port=8080):
    target_url = f"http://{target_ip}:{port}"
    print(f"\n============================================================")
    print(f" UBVM Network Test")
    print(f" Target: {target_url}")
    print(f"============================================================\n")

    # 1. Discovery Ping
    print("[TEST 1] Discovery Handshake (/discover)")
    try:
        req = urllib.request.Request(f"{target_url}/discover", method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"  ✅ Success! Connected to node: {data.get('node_id')}")
    except URLError as e:
        print(f"  ❌ Failed: {e}")
        print("\n[!] CRITICAL NETWORK ERROR [!]")
        print("If Test 1 timed out, your devices cannot see each other.")
        print("- Ensure both devices are on the EXACT same Wi-Fi network.")
        print("- Ensure the IP address is correct.")
        print("- Ensure your router does NOT have 'AP Isolation' or 'Client Isolation' enabled.")
        sys.exit(1)

    ts = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # 2. Remote Event Emission
    print("\n[TEST 2] Remote Event Emission (/events/receive)")
    event_payload = {
        "event": "cluster.sync.ping",
        "source": "ubvm/test-script",
        "payload": {"message": "Hello from the single-file test!"},
        "ts": ts
    }
    try:
        body = json.dumps(event_payload).encode('utf-8')
        req = urllib.request.Request(f"{target_url}/events/receive", data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"  ✅ Success! Event accepted: {data.get('event')}")
    except URLError as e:
        print(f"  ❌ Failed: {e}")

    # 3. Binary Capsule Transmission (zlib)
    print("\n[TEST 3] Binary Capsule Transport (/scp/receive)")
    capsule_payload = {
        "scp_transport": "0.1",
        "sent_at": ts,
        "source_node": "ubvm/test-script",
        "target_node": "unknown",
        "capsule": {
            "scp_version": "0.1",
            "scp_id": "test/single-file-remote",
            "object_class": "Safe",
            "intent": "Network connectivity test",
            "behaviours": []
        }
    }
    try:
        raw_body = json.dumps(capsule_payload).encode('utf-8')
        compressed_body = zlib.compress(raw_body)
        req = urllib.request.Request(f"{target_url}/scp/receive", data=compressed_body, method="POST")
        req.add_header("Content-Type", "application/ubvm-bin")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"  ✅ Success! Capsule accepted: {data.get('scp_id')}")
    except URLError as e:
        print(f"  ❌ Failed: {e}")

if __name__ == "__main__":
    ip = input("Enter Target IP (or press Enter for localhost): ").strip()
    run_tests(ip if ip else "127.0.0.1")