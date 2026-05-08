#!/usr/bin/env python3
# mom_wire.py — Wire T.E Momentum into CCE Platform Core
# Run from ~/cce-crypto: python3 ~/mom_wire.py

idx = open('index.js').read()

# 1. Add require
idx = idx.replace(
    "const CCEGridEngine  = require('./src/cce-grid-engine');",
    "const CCEGridEngine  = require('./src/cce-grid-engine');\nconst CCEMOMEngine   = require('./src/cce-mom-engine');"
)

# 2. Add instantiation after grid — MOM needs exchange connector
idx = idx.replace(
    "  if (gridEngine) engines.push(gridEngine.start(gridInterval));",
    """  if (gridEngine) engines.push(gridEngine.start(gridInterval));

  // T.E Momentum — 2H momentum trading engine
  const momEnabled = config.mom?.enabled === true;
  const momEngine  = momEnabled ? new CCEMOMEngine(config, sharedNotifier, cryptoEngine.exchange) : null;
  if (momEngine) engines.push(momEngine.start(config.mom?.intervalMinutes || 120));"""
)

# 3. Add to shutdown
idx = idx.replace(
    "if (gridEngine) gridEngine.stop();",
    "if (gridEngine) gridEngine.stop();\n    if (momEngine) momEngine.stop();"
)

# 4. Add to banner
idx = idx.replace(
    "console.log(`   📐 CCE Grid    — ${gridEnabled ? gridInterval+'min interval | '+(config.grid?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  const strEnabled",
    "console.log(`   📐 CCE Grid    — ${gridEnabled ? gridInterval+'min interval | '+(config.grid?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  const momEnabled = config.mom?.enabled === true;\n  console.log(`   🚀 T.E Momentum — ${momEnabled ? '120min interval | '+(config.mom?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);\n  const strEnabled"
)

open('index.js', 'w').write(idx)
print('index.js patched')

# 5. Patch config.js
cfg = open('config.js').read()

mom_block = """  mom: {
    enabled:         false,   // Set to true when ready
    dryRun:          true,    // Set to false for live trading
    capitalUSDC:     125,     // $125 USDC (~£100 from S.E Crypto)
    pairs:           ['BTC/USDC', 'ETH/USDC', 'SOL/USDC'],
    intervalMinutes: 120,     // 2H cycle
    maxPositions:    2,       // Max concurrent positions
    riskPct:         0.02,    // 2% risk per trade
    maxDailyLoss:    0.03,    // 3% max daily loss circuit breaker
    cooldownCandles: 2,       // Candles to wait after a loss
    emaFast:         9,
    emaSlow:         21,
    emaTrend:        50,
    rsiPeriod:       14,
    rsiEntry:        55,
    volumeMult:      1.5,
    atrPeriod:       14,
    atrStopMult:     2.0,
    atrTpMult:       3.0,
    atrTrailMult:    1.5,
    maxHoldCandles:  3,
    feeRate:         0.0016
  },"""

cfg = cfg.replace(
    "  grid: {",
    mom_block + "\n  grid: {"
)

open('config.js', 'w').write(cfg)
print('config.js patched')

print('\nDone! T.E Momentum wired in.')
print('Steps to activate:')
print('1. Transfer £100 capital within Kraken (reduce crypto allocation)')
print('2. Set mom.enabled = true in config.js')
print('3. Run in dry run first (mom.dryRun = true)')
print('4. After 10+ dry run signals, set mom.dryRun = false for live')
