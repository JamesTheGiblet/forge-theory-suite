#!/usr/bin/env python3
# str_wire.py — Wire O.E Strategist into CCE Platform Core
# Run from ~/cce-crypto: python3 ~/str_wire.py

idx = open('index.js').read()

# 1. Add require
idx = idx.replace(
    "const CCEOBSEngine   = require('./src/cce-obs-engine');",
    "const CCEOBSEngine   = require('./src/cce-obs-engine');\nconst CCESTREngine   = require('./src/cce-str-engine');"
)

# 2. Add instantiation after obs engine
idx = idx.replace(
    "  if (obsEngine) engines.push(obsEngine.start(config.obs?.intervalMinutes || 15));",
    """  if (obsEngine) engines.push(obsEngine.start(config.obs?.intervalMinutes || 15));

  // O.E Strategist — intelligence and recommendation layer
  const strEnabled = config.str?.enabled === true;
  const strEngine  = strEnabled ? new CCESTREngine(config, sharedNotifier) : null;
  if (strEngine) engines.push(strEngine.start(config.str?.intervalMinutes || 60));"""
)

# 3. Add to shutdown
idx = idx.replace(
    "if (obsEngine) obsEngine.stop();",
    "if (obsEngine) obsEngine.stop();\n    if (strEngine) strEngine.stop();"
)

# 4. Add to banner
idx = idx.replace(
    "  console.log(`   👁️  O.E Observer — ${obsEnabled ? (config.obs?.intervalMinutes || 15)+'min interval | ACTIVE' : 'DISABLED'}`);",
    "  console.log(`   👁️  O.E Observer  — ${obsEnabled ? (config.obs?.intervalMinutes || 15)+'min interval | ACTIVE' : 'DISABLED'}`);\n  const strEnabled = config.str?.enabled === true;\n  console.log(`   🧠 O.E Strategist — ${strEnabled ? (config.str?.intervalMinutes || 60)+'min interval | ACTIVE' : 'DISABLED (enable after 96 obs)'}`);"
)

open('index.js', 'w').write(idx)
print('index.js patched')

# 5. Patch config.js
cfg = open('config.js').read()

str_block = """  str: {
    enabled:         false,  // Enable after Observer has 96+ observations (~24h)
    intervalMinutes: 60,     // Run analysis every hour
    totalCapital:    516     // Total capital under management ($391 crypto + $125 grid)
  },"""

cfg = cfg.replace(
    "  obs: {",
    str_block + "\n  obs: {"
)

open('config.js', 'w').write(cfg)
print('config.js patched')

print('\nDone! O.E Strategist wired in.')
print('IMPORTANT: Enable after Observer has 96+ observations (~24 hours of data).')
print('Set str.enabled = true in config.js when ready.')
print('Commands available via Telegram: /briefing /predict /regime /allocate /anomalies /status /help')
