#!/usr/bin/env python3
# brk_wire.py — Wire T.E Breakout into CCE Platform Core
# Run from ~/cce-crypto: python3 ~/brk_wire.py

idx = open('index.js').read()

# 1. Add require
idx = idx.replace(
    "const CCEMOMEngine   = require('./src/cce-mom-engine');",
    "const CCEMOMEngine   = require('./src/cce-mom-engine');\nconst CCEBRKEngine   = require('./src/cce-brk-engine');"
)

# 2. Add instantiation after momentum
idx = idx.replace(
    "  if (momEngine) engines.push(momEngine.start(config.mom?.intervalMinutes || 120));",
    """  if (momEngine) engines.push(momEngine.start(config.mom?.intervalMinutes || 120));

  // T.E Breakout — 1H volatility squeeze breakout engine
  const brkEnabled = config.brk?.enabled === true;
  const brkEngine  = brkEnabled ? new CCEBRKEngine(config, sharedNotifier, cryptoEngine.exchange) : null;
  if (brkEngine) engines.push(brkEngine.start(config.brk?.intervalMinutes || 60));"""
)

# 3. Add to shutdown
idx = idx.replace(
    "if (momEngine) momEngine.stop();",
    "if (momEngine) momEngine.stop();\n    if (brkEngine) brkEngine.stop();"
)

# 4. Add to banner after momentum
idx = idx.replace(
    "  console.log(`   🚀 T.E Momentum — ${momEnabled ? '120min interval | '+(config.mom?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);\n  const strEnabled",
    "  console.log(`   🚀 T.E Momentum — ${momEnabled ? '120min interval | '+(config.mom?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);\n  const brkEnabled = config.brk?.enabled === true;\n  console.log(`   💥 T.E Breakout — ${brkEnabled ? '60min interval | '+(config.brk?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);\n  const strEnabled"
)

open('index.js', 'w').write(idx)
print('index.js patched')

# 5. Patch config.js
cfg = open('config.js').read()

brk_block = """  brk: {
    enabled:         false,   // Set to true when ready
    dryRun:          true,    // Set to false for live trading
    capitalUSDC:     100,     // $100 USDC
    pairs:           ['BTC/USDC', 'ETH/USDC', 'SOL/USDC'],
    intervalMinutes: 60,      // 1H cycle
    maxPositions:    2,
    riskPct:         0.02,
    maxDailyLoss:    0.03,
    bbPeriod:        20,
    bbStdDev:        2.0,
    squeezePct:      0.02,    // Band width < 2% = squeeze
    squeezeBars:     6,       // Min bars in squeeze before watching
    volumeMult:      1.8,     // Volume must be 1.8x average
    atrPeriod:       14,
    atrStopMult:     1.5,     // Tighter stop than momentum
    atrTpMult:       2.5,
    maxHoldBars:     6,       // 6 hours max hold
    feeRate:         0.0016
  },"""

cfg = cfg.replace(
    "  mom: {",
    brk_block + "\n  mom: {"
)

open('config.js', 'w').write(cfg)
print('config.js patched')

print('\nDone! T.E Breakout wired in.')
print('Steps to activate:')
print('1. Set brk.enabled = true in config.js')
print('2. Run dry (brk.dryRun = true) for 10+ signal cycles')
print('3. Review squeeze detection and breakout signals')
print('4. Set brk.dryRun = false for live')
