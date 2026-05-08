const fs = require('fs');

// Add 30 new tests to tests.scp
const testsPath = './scp/tests.scp';
const tests = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

// Add new test categories
tests.test_categories.network = {
  enabled: true,
  tests: [
    { id: "NET-001", name: "Localhost Reachable", type: "port", port: 3011, expected: "in_use" },
    { id: "NET-002", name: "API Response Time", type: "latency", endpoint: "/api/status", max_ms: 100 },
    { id: "NET-003", name: "API Available", type: "http", endpoint: "/api/status", expected_status: 200 }
  ]
};

tests.test_categories.data_quality = {
  enabled: true,
  tests: [
    { id: "DATA-004", name: "No Orphaned Strategy Files", type: "orphan_check", dir: "./data/strategies", max_age_days: 30 },
    { id: "DATA-005", name: "Report Size OK", type: "file_size", dir: "./reports", max_bytes: 1048576 },
    { id: "DATA-006", name: "Backup Directory Writable", type: "directory", target: "./backups", writable: true }
  ]
};

tests.test_categories.agent_health = {
  enabled: true,
  tests: [
    { id: "AHL-001", name: "ForgeLord Active", type: "agent_state", agent: "ForgeLord", state: "running" },
    { id: "AHL-002", name: "Reaper Active", type: "agent_state", agent: "Reaper", state: "running" },
    { id: "AHL-003", name: "Librarian Active", type: "agent_state", agent: "Librarian", state: "running" },
    { id: "AHL-004", name: "No Agent Memory Leaks", type: "agent_memory", agent: "all", max_mb: 150 }
  ]
};

tests.test_categories.security_hardening = {
  enabled: true,
  tests: [
    { id: "SEC-005", name: "No Console Log Noise", type: "grep", target: "./agents", pattern: "console\\.log", expected: false },
    { id: "SEC-006", name: "CORS Configured", type: "http_header", endpoint: "/api/status", header: "access-control-allow-origin", expected: "*" },
    { id: "SEC-007", name: "No SQL Injection Vectors", type: "grep", target: "./agents", pattern: "\\$\\{.*\\}\\`", expected: false },
    { id: "SEC-008", name: "API Port Secure", type: "port", port: 3011, expected: "in_use" }
  ]
};

tests.test_categories.performance = {
  enabled: true,
  tests: [
    { id: "PRF-004", name: "JSON Parse Fast", type: "benchmark", action: "parse_json", target: "./scp/SCP.json", max_ms: 10 },
    { id: "PRF-005", name: "Agent Spawn Fast", type: "benchmark", action: "agent_spawn", max_ms: 100 },
    { id: "PRF-006", name: "Concurrent API Calls", type: "concurrent", endpoint: "/api/status", concurrency: 10, max_ms: 500 }
  ]
};

tests.test_categories.disaster_recovery = {
  enabled: true,
  tests: [
    { id: "DR-001", name: "SCP.json Backup", type: "file", target: "./backups/SCP.json.bak", validate: "exists" },
    { id: "DR-002", name: "Reports Directory Safe", type: "directory", target: "./reports", writable: true },
    { id: "DR-003", name: "Entropy API Accessible", type: "http", endpoint: "/api/entropy", expected_status: 200 }
  ]
};

tests.test_categories.integration = {
  enabled: true,
  tests: [
    { id: "INT-004", name: "Agent-Engine Communication", type: "integration", test: "agent_engine_sync" },
    { id: "INT-005", name: "Entropy Propagation", type: "integration", test: "entropy_propagation" },
    { id: "INT-006", name: "Report Generation Chain", type: "integration", test: "report_alert_chain" }
  ]
};

tests.test_categories.resource_limits = {
  enabled: true,
  tests: [
    { id: "RES-001", name: "Memory Under Limit", type: "memory", threshold_mb: 500 },
    { id: "RES-002", name: "CPU Under Limit", type: "cpu", threshold_percent: 50 },
    { id: "RES-003", name: "Event Loop Responsive", type: "timing", action: "heartbeat", max_ms: 50 }
  ]
};

tests.test_categories.compliance = {
  enabled: true,
  tests: [
    { id: "CMP-001", name: "SCP Format Valid", type: "json_parse", target: "./scp/SCP.json" },
    { id: "CMP-002", name: "Containment Procedures Exist", type: "schema", target: "./scp/SCP.json", field: "containment", required: true },
    { id: "CMP-003", name: "Evolution Metrics Tracked", type: "schema", target: "./scp/SCP.json", field: "evolution", required: true }
  ]
};

tests.test_categories.stability = {
  enabled: true,
  tests: [
    { id: "STB-001", name: "Memory Stable", type: "stability", metric: "memory", duration_seconds: 5, max_change_percent: 10 },
    { id: "STB-002", name: "No Zombie Processes", type: "stability", metric: "zombies", max_count: 0 },
    { id: "STB-003", name: "CPU Stable", type: "stability", metric: "cpu", duration_seconds: 5, max_change_percent: 20 }
  ]
};

// Update total
tests.signature.total_tests = 68;

fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));
console.log('✅ Added 30 new tests to tests.scp (total: 68 tests)');
console.log('New categories: network, data_quality, agent_health, security_hardening, performance, disaster_recovery, integration, resource_limits, compliance, stability');
