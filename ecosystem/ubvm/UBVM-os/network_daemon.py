#!/usr/bin/env python3
"""
UBVM network_daemon.py
Inter-node HTTP transport and discovery for UBVM 2.0.
Listens for incoming SCP capsules and discovery pings.
"""

import os
import json
import datetime
import interpreter  # Imports UBVM device bridge & defaults
from http.server import HTTPServer, BaseHTTPRequestHandler

class UBVMNodeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/discover":
            self._respond(200, {
                "node_id": os.environ.get("UBVM_NODE_ID", "ubvm/node-default"),
                "status": "online",
                "scp_transport": "0.1",
                "ubvm_version": "2.0-draft"
            })
        elif self.path == "/dashboard":
            ubvm_home = os.environ.get("UBVM_HOME", os.path.dirname(os.path.abspath(__file__)))
            dash_path = os.path.join(ubvm_home, "clients", "dashboard.html")
            if os.path.exists(dash_path):
                with open(dash_path, "r", encoding="utf-8") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                self.wfile.write(content.encode('utf-8'))
            else:
                self._respond(404, {"status": "error", "reason": "Dashboard not found"})
        elif self.path == "/api/status":
            self._handle_api_status()
        else:
            self._respond(404, {"status": "error", "reason": "Not found"})

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        # SCP 0.2 Binary Transport Support
        content_type = self.headers.get('Content-Type', '')
        if content_type == 'application/ubvm-bin':
            import zlib
            try:
                body = zlib.decompress(body)
            except Exception:
                self._respond(400, {"status": "rejected", "reason": "Invalid binary compression"})
                return

        try:
            payload = json.loads(body)
            if not isinstance(payload, dict):
                raise ValueError("Payload must be a JSON object")
        except Exception:
            self._respond(400, {"status": "rejected", "reason": "Invalid JSON"})
            return
            
        if self.path == "/scp/receive":
            self._handle_scp(payload)
        elif self.path == "/events/receive" or self.path == "/api/emit":
            self._handle_event(payload)
        elif self.path == "/api/chat":
            self._handle_api_chat(payload)
        else:
            self._respond(404, {"status": "rejected", "reason": "Endpoint not found"})

    def _handle_api_chat(self, payload):
        """Executes the buddai/brain capsule live using the OS interpreter!"""
        msg = payload.get("message")
        if not msg:
            self._respond(400, {"error": "Missing message"})
            return

        ubvm_home = os.environ.get("UBVM_HOME", os.path.dirname(os.path.abspath(__file__)))
        brain_path = os.path.join(ubvm_home, "capsules", "buddai", "buddai.conversation.scp.json")
        
        if not os.path.exists(brain_path):
            self._respond(500, {"error": "buddai/conversation capsule not found"})
            return
            
        try:
            capsule = interpreter.load_capsule(brain_path)
            dispatch = interpreter.build_dispatch(ubvm_home=ubvm_home, verbose=False)
            
            # Pass the web input into the system as an event
            res = interpreter.run_capsule(
                capsule, 
                trigger_type="on_event", 
                event_name="james.message", 
                event_payload={"message": f"[Web Dashboard] {msg}"}, 
                dispatch=dispatch
            )
            
            # Extract the thought directly from the primitive's return value
            thought = "I could not form a thought."
            for r in res.get("results", []):
                if r.get("primitive") == "llm_reason":
                    thought = r.get("result", {}).get("thought", thought)
                    break

            self._respond(200, {"response": thought})
        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _handle_api_status(self):
        """Aggregates all organism data into a unified JSON state payload."""
        import glob
        import csv
        ubvm_home = os.environ.get("UBVM_HOME", os.path.dirname(os.path.abspath(__file__)))
        
        def read_json(path):
            if os.path.exists(path):
                try:
                    with open(path, "r") as f: return json.load(f)
                except Exception: pass
            return {}

        strategy = read_json(os.path.join(ubvm_home, "strategies", "selected", "current_best.json"))

        memories = []
        mem_dir = os.path.join(ubvm_home, "data", "buddai", "memory")
        if os.path.exists(mem_dir):
            for f in sorted(glob.glob(os.path.join(mem_dir, "*.json")), reverse=True)[:20]:
                m = read_json(f)
                m["tier"] = "short_term"
                memories.append(m)
        
        core_dir = os.path.join(ubvm_home, "data", "incybe", "core_memory")
        if os.path.exists(core_dir):
            for f in sorted(glob.glob(os.path.join(core_dir, "*.json")), reverse=True)[:10]:
                m = read_json(f)
                m["tier"] = "long_term"
                m["thought"] = m.get("core_facts", "")
                memories.append(m)

        signals = []
        sig_path = os.path.join(ubvm_home, "logs", "dry_run_signals.csv")
        if os.path.exists(sig_path):
            try:
                with open(sig_path, "r") as f:
                    signals = list(csv.DictReader(f))[-50:]
            except Exception: pass

        anchors = []
        anch_dir = os.path.join(ubvm_home, "anchors")
        if os.path.exists(anch_dir):
            for f in sorted(glob.glob(os.path.join(anch_dir, "*.json")), reverse=True)[:10]:
                anchors.append(read_json(f))

        cube_nodes = []
        cube_dir = os.path.join(ubvm_home, "data", "incybe", "cube", "nodes")
        if os.path.exists(cube_dir):
            for f in sorted(glob.glob(os.path.join(cube_dir, "*.json")), reverse=True)[:20]:
                n = read_json(f)
                n["id"] = n.get("node_id")
                n["name"] = ", ".join(n.get("dimensions", []))
                n["timestamp"] = n.get("mapped_at")
                
                content_val = n.get("content", "")
                if content_val and isinstance(content_val, str):
                    file_path = os.path.join(ubvm_home, content_val) if not os.path.isabs(content_val) else content_val
                    if os.path.isfile(file_path):
                        try:
                            with open(file_path, "r", encoding="utf-8") as cf:
                                n["file_data"] = cf.read()
                        except Exception:
                            pass
                            
                cube_nodes.append(n)

        market_data = read_json(os.path.join(ubvm_home, "data", "legion", "market_status.json"))

        events = []
        queue_path = os.path.join(ubvm_home, "logs", "events", "queue.jsonl")
        if os.path.exists(queue_path):
            try:
                with open(queue_path, "r") as f:
                    for l in f.readlines()[-50:]:
                        if l.strip():
                            try: events.append(json.loads(l))
                            except Exception: pass
            except Exception: pass

        capsule_count = 0
        cap_dir = os.path.join(ubvm_home, "capsules")
        if os.path.exists(cap_dir):
            for root, _, files in os.walk(cap_dir):
                capsule_count += sum(1 for f in files if f.endswith(".scp.json"))

        logs = []
        log_path = os.path.join(ubvm_home, "logs", "ubvm.log")
        if os.path.exists(log_path):
            try:
                with open(log_path, "r") as f:
                    logs = [l.strip() for l in f.readlines()[-100:] if l.strip()]
            except Exception: pass

        self._respond(200, {
            "ts": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "strategy": strategy,
            "market": market_data,
            "memories": memories,
            "signals": signals,
            "anchors": anchors,
            "cube_nodes": cube_nodes,
            "events": events,
            "capsule_count": capsule_count,
            "logs": logs
        })

    def _handle_scp(self, payload):
        """Handle incoming capsules over SCP transport envelope."""
        if payload.get("scp_transport") != "0.1":
            self._respond(400, {"status": "rejected", "reason": "Unsupported scp_transport"})
            return
            
        capsule = payload.get("capsule")
        if not capsule or "scp_id" not in capsule:
            self._respond(400, {"status": "rejected", "reason": "Invalid capsule payload"})
            return
            
        ubvm_home = os.environ.get("UBVM_HOME", os.path.dirname(os.path.abspath(__file__)))
        safe_id = capsule["scp_id"].replace("/", "_").replace(" ", "_")
        path = os.path.join(ubvm_home, "capsules", f"{safe_id}.scp.json")
        
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w") as f:
                json.dump(capsule, f, indent=2)
            print(f"[{datetime.datetime.utcnow().isoformat()}Z] [NETWORK] Received capsule: {capsule['scp_id']}")
            self._respond(200, {
                "status": "accepted",
                "scp_id": capsule["scp_id"]
            })
        except Exception as e:
            self._respond(500, {"status": "rejected", "reason": str(e)})

    def _handle_event(self, payload):
        """Handle incoming remote events and inject them into the local event bus."""
        event_name = payload.get("event")
        if not event_name:
            self._respond(400, {"status": "rejected", "reason": "Missing event name"})
            return

        ubvm_home = os.environ.get("UBVM_HOME", os.path.dirname(os.path.abspath(__file__)))
        queue_path = os.path.join(ubvm_home, "logs", "events", "queue.jsonl")
        
        try:
            os.makedirs(os.path.dirname(queue_path), exist_ok=True)
            with open(queue_path, "a") as f:
                f.write(json.dumps(payload) + "\n")
            print(f"[{datetime.datetime.utcnow().isoformat()}Z] [NETWORK] Received remote event: {event_name}")
            self._respond(200, {"status": "accepted", "event": event_name})
        except Exception as e:
            self._respond(500, {"status": "rejected", "reason": str(e)})

    def _respond(self, code, data):
        try:
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # Harmless error when the browser disconnects before the response completes
            pass

def run_server(port=8080):
    server_address = ('', port)
    httpd = HTTPServer(server_address, UBVMNodeHandler)
    node_id = os.environ.get("UBVM_NODE_ID", "ubvm/node-default")
    print(f"UBVM 2.0 Network Daemon started.")
    print(f"Node ID: {node_id}")
    print(f"Listening on port {port}...")
    print("-" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run_server(port)