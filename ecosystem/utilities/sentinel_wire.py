#!/usr/bin/env python3
# sentinel_wire.py — Wires O.E Sentinel into the CCE platform
# Run from ~/cce-crypto: python3 ~/sentinel_wire.py

import re, sys

# ── CONFIG ────────────────────────────────────────────────────────────────────

CONFIG_ADD = """
  sentinel: {
    enabled:         true,
    intervalMinutes: 15,          // Runs alongside Observer
  },"""

INDEX_IMPORT = "const CCSentinelEngine = require('./src/cce-sentinel-engine');"

INDEX_INIT = """
  // O.E Sentinel
  let sentinelEngine = null;
  if (config.sentinel?.enabled) {
    sentinelEngine = new CCSentinelEngine(config.sentinel, telegramNotifier);
  }"""

INDEX_LAUNCH = """
  if (config.sentinel?.enabled) {
    engines.push({ name: 'cce-sentinel', start: () => sentinelEngine.start() });
    console.log('   🛡️  O.E Sentinel — ' + config.sentinel.intervalMinutes + 'min interval | ACTIVE');
  }"""

INDEX_STOP = """
  if (sentinelEngine) sentinelEngine.stop();"""

DASHBOARD_API = '''
// Sentinel API
app.get('/api/sentinel/status', (req, res) => {
  try {
    if (!sentinelEngine) return res.json({ active_anomalies: 0, active: [], recent: [] });
    res.json(sentinelEngine.getStatus());
  } catch(e) { res.status(500).json({ error: e.message }); }
});
'''

BANNER_LINE = """    console.log('   🛡️  O.E Sentinel — ' + config.sentinel.intervalMinutes + 'min | ACTIVE');"""

# ── PATCH config.js ───────────────────────────────────────────────────────────

def patch_config():
    with open('config.js', 'r') as f:
        c = f.read()

    if 'sentinel:' in c:
        print('config.js: sentinel already present')
        return

    # Insert after obs block
    c = c.replace(
        "  obs: {",
        CONFIG_ADD + "\n\n  obs: {"
    )

    with open('config.js', 'w') as f:
        f.write(c)
    print('✅ config.js: sentinel block added')

# ── PATCH index.js ────────────────────────────────────────────────────────────

def patch_index():
    with open('index.js', 'r') as f:
        c = f.read()

    if 'CCSentinelEngine' in c:
        print('index.js: sentinel already wired')
        return

    # Add import after Observer import
    c = c.replace(
        "const CCObserverEngine",
        INDEX_IMPORT + "\nconst CCObserverEngine"
    )

    # Add init after Observer init
    c = c.replace(
        "  // O.E Observer",
        INDEX_INIT + "\n\n  // O.E Observer"
    )

    # Add to launch list in banner area — after Observer launch line
    c = c.replace(
        "    console.log('   👁️  O.E Observer",
        BANNER_LINE + "\n    console.log('   👁️  O.E Observer"
    )

    # Add to engines array — after Observer push
    c = c.replace(
        "  if (config.obs?.enabled) {\n    engines.push({ name: 'cce-obs'",
        "  if (config.sentinel?.enabled) {\n    engines.push({ name: 'cce-sentinel', start: () => sentinelEngine.start() });\n  }\n\n  if (config.obs?.enabled) {\n    engines.push({ name: 'cce-obs'"
    )

    # Add stop
    c = c.replace(
        "  if (obsEngine) obsEngine.stop();",
        "  if (sentinelEngine) sentinelEngine.stop();\n  if (obsEngine) obsEngine.stop();"
    )

    with open('index.js', 'w') as f:
        f.write(c)
    print('✅ index.js: sentinel wired')

# ── PATCH dashboard-server.js ─────────────────────────────────────────────────

def patch_dashboard():
    with open('dashboard-server.js', 'r') as f:
        c = f.read()

    if '/api/sentinel/status' in c:
        print('dashboard-server.js: sentinel API already present')
        return

    # Add API before the last app.listen or module.exports
    if 'module.exports' in c:
        c = c.replace('module.exports', DASHBOARD_API + '\nmodule.exports')
    elif 'app.listen' in c:
        idx = c.rfind('app.listen')
        c = c[:idx] + DASHBOARD_API + '\n' + c[idx:]

    with open('dashboard-server.js', 'w') as f:
        f.write(c)
    print('✅ dashboard-server.js: sentinel API added')

# ── MAIN ──────────────────────────────────────────────────────────────────────

print('\n🛡️  O.E Sentinel — Wiring Script')
print('=' * 40)

try:
    patch_config()
    patch_index()
    patch_dashboard()
    print('\n✅ All patches applied.')
    print('\nNext steps:')
    print('  1. cp ~/storage/downloads/cce-sentinel-engine.js ~/cce-crypto/src/')
    print('  2. python3 ~/sentinel_wire.py')
    print('  3. pm2 restart cce-bot')
    print('  4. pm2 logs cce-bot | grep SEN')
except Exception as e:
    print(f'\n❌ Error: {e}')
    sys.exit(1)
