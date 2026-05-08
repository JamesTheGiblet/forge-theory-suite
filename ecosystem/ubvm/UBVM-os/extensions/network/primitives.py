#!/usr/bin/env python3
"""
UBVM Extension: network/primitives.py
Inter-node transport primitives for UBVM 2.0.
"""

import os
import json
import urllib.request
import datetime
import zlib

def primitive_transmit_capsule(params: dict, context: dict) -> dict:
    """
    Transmits a capsule to a remote UBVM node over HTTP using SCP 0.2 binary transport.
    """
    target_url = params.get("target_url")
    capsule_path = params.get("capsule_path")
    
    if not target_url or not capsule_path:
        return {"status": "error", "error": "target_url and capsule_path are required."}
        
    ubvm_home = context["ubvm_home"]
    if not os.path.isabs(capsule_path):
        capsule_path = os.path.join(ubvm_home, capsule_path)
        
    try:
        with open(capsule_path, "r") as f:
            capsule = json.load(f)
    except Exception as e:
        return {"status": "error", "error": f"Failed to read capsule: {e}"}
        
    envelope = {
        "scp_transport": "0.1",
        "sent_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_node": os.environ.get("UBVM_NODE_ID", "ubvm/node-default"),
        "target_node": params.get("target_node", "unknown"),
        "capsule": capsule
    }
    
    try:
        # Compress the payload using zlib for application/ubvm-bin
        payload_bytes = json.dumps(envelope).encode('utf-8')
        compressed_payload = zlib.compress(payload_bytes)
        
        req = urllib.request.Request(
            f"{target_url}/scp/receive",
            data=compressed_payload,
            headers={"Content-Type": "application/ubvm-bin"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_data = json.loads(resp.read().decode())
            return {"status": "ok", "response": resp_data}
    except Exception as e:
        return {"status": "error", "error": f"Transport failed: {str(e)}"}

def primitive_emit_remote_event(params: dict, context: dict) -> dict:
    """
    Emits an event directly to a remote UBVM node's event bus.
    """
    target_url = params.get("target_url")
    event_name = params.get("event")
    
    if not target_url or not event_name:
        return {"status": "error", "error": "target_url and event are required."}
        
    payload = {
        "event": event_name,
        "source": context["scp_id"],
        "payload": params.get("payload", {}),
        "ts": context["timestamp"],
        "remote_source_node": os.environ.get("UBVM_NODE_ID", "ubvm/node-default")
    }
    
    try:
        req = urllib.request.Request(
            f"{target_url}/events/receive",
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {"status": "ok", "event": event_name, "target": target_url}
    except Exception as e:
        return {"status": "error", "error": f"Remote emit failed: {str(e)}"}

def register() -> dict:
    return {
        "transmit_capsule": primitive_transmit_capsule,
        "emit_remote_event": primitive_emit_remote_event
    }