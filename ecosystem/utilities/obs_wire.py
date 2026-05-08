#!/usr/bin/env python3
# obs_wire.py — Wire O.E Observer into CCE Platform Core
# Run from ~/cce-crypto: python3 ~/obs_wire.py

import os

idx = open('index.js').read()

# 1. Add require
idx = idx.replace(
    "const CCEGridEngine  = require('./src/cce-grid-engine');",
    "const CCEGridEngine  = require('./src/cce-grid-engine');\nconst CCEOBSEngine   = require('./src/cce-obs-engine');"
)

# 2. Add instantiation after grid — OBS gets references to all engines
idx = idx.replace(
    "  if (gridEngine) engines.push(gridEngine.start(gridInterval));",
    """  if (gridEngine) engines.push(gridEngine.start(gridInterval));

  // O.E Observer — passive intelligence layer
  const obsEnabled = config.obs?.enabled !== false;
  const obsEngine  = obsEnabled ? new CCEOBSEngine(config, sharedNotifier, {
    crypto: cryptoEngine,
    forex:  forexEngine,
    rme:    rmeEngine,
    cme:    cmeEngine,
    como:   comoEngine,
    grid:   gridEngine
  }) : null;
  if (obsEngine) engines.push(obsEngine.start(config.obs?.intervalMinutes || 15));"""
)

# 3. Add to shutdown
idx = idx.replace(
    "if (gridEngine) gridEngine.stop();",
    "if (gridEngine) gridEngine.stop();\n    if (obsEngine) obsEngine.stop();"
)

# 4. Add to banner
idx = idx.replace(
    "console.log(`   📐 CCE Grid    — ${gridEnabled ? gridInterval+'min interval | '+(config.grid?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');",
    "console.log(`   📐 CCE Grid    — ${gridEnabled ? gridInterval+'min interval | '+(config.grid?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log(`   👁️  O.E Observer — ${obsEnabled ? (config.obs?.intervalMinutes || 15)+'min interval | ACTIVE' : 'DISABLED'}`);\n  console.log('');"
)

open('index.js', 'w').write(idx)
print('index.js patched')

# 5. Patch config.js
cfg = open('config.js').read()

obs_block = """  obs: {
    enabled:         true,   // Observer is always on — passive only
    intervalMinutes: 15,     // Observe every 15 minutes
    patternInterval: 96      // Run pattern analysis every 96 obs (~24h)
  },"""

cfg = cfg.replace(
    "  grid: {",
    obs_block + "\n  grid: {"
)

open('config.js', 'w').write(cfg)
print('config.js patched')

print('\nDone! O.E Observer wired in.')
print('Observer is ENABLED by default — passive observation only.')
print('No engine interference possible by design.')
