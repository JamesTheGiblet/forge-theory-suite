#!/usr/bin/env python3
# grid_wire.py — Wire grid engine into CCE Platform Core
# Run from ~/cce-crypto: python3 ~/grid_wire.py

import os

# ── PATCH index.js ──────────────────────────────────────────────────────────

idx = open('index.js').read()

# 1. Add require
idx = idx.replace(
    "const CCECOMOEngine  = require('./src/cce-como-engine');",
    "const CCECOMOEngine  = require('./src/cce-como-engine');\nconst CCEGridEngine  = require('./src/cce-grid-engine');"
)

# 2. Add instantiation (grid needs exchange connector — pass from crypto engine)
idx = idx.replace(
    "const comoEngine     = comoEnabled ? new CCECOMOEngine(config, sharedNotifier) : null;",
    "const comoEngine     = comoEnabled ? new CCECOMOEngine(config, sharedNotifier) : null;\n  const gridEnabled    = config.grid?.enabled === true;\n  const gridEngine     = gridEnabled ? new CCEGridEngine(config, sharedNotifier, cryptoEngine.exchangeConnector) : null;"
)

# 3. Add to shutdown
idx = idx.replace(
    "if (comoEngine) comoEngine.stop();",
    "if (comoEngine) comoEngine.stop();\n    if (gridEngine) gridEngine.stop();"
)

# 4. Add interval and banner
idx = idx.replace(
    "const comoInterval   = config.como?.intervalHours || 24;",
    "const comoInterval   = config.como?.intervalHours || 24;\n  const gridInterval   = config.grid?.intervalMinutes || 5;"
)

idx = idx.replace(
    "console.log(`   🛢️  CCE Commod  — ${comoEnabled ? comoInterval+'H interval | '+(config.como?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');",
    "console.log(`   🛢️  CCE Commod  — ${comoEnabled ? comoInterval+'H interval | '+(config.como?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log(`   📐 CCE Grid    — ${gridEnabled ? gridInterval+'min interval | '+(config.grid?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  console.log('');"
)

# 5. Add to engines array (grid uses minutes not hours)
idx = idx.replace(
    "if (comoEngine) engines.push(comoEngine.start(comoInterval));",
    "if (comoEngine) engines.push(comoEngine.start(comoInterval));\n  if (gridEngine) engines.push(gridEngine.start(gridInterval));"
)

open('index.js', 'w').write(idx)
print('index.js patched')

# ── PATCH config.js ──────────────────────────────────────────────────────────

cfg = open('config.js').read()

grid_block = """  grid: {
    enabled:      false,   // Set to true when ready to run grid
    dryRun:       true,    // Set to false for live trading
    capitalUSDC:  125,     // $125 USDC (~£100)
    spacing:      0.01,    // 1% between levels
    levels:       10,      // Total grid levels
    intervalMinutes: 5,    // Check every 5 minutes
    makerFee:     0.0016,  // Kraken maker fee
    takerFee:     0.0026,  // Kraken taker fee
    stopLossPct:  0.15,    // Stop if BTC drops 15% from centre
    recentrePct:  0.05,    // Recentre if price drifts 5%
    fsm:          {}
  },"""

cfg = cfg.replace(
    "  como: {",
    grid_block + "\n  como: {"
)

open('config.js', 'w').write(cfg)
print('config.js patched')

print('\nDone! Grid engine wired in.')
print('Note: grid.enabled is FALSE by default — set to true when ready to run.')
