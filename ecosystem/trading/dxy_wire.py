#!/usr/bin/env python3
# dxy_wire.py — Wire DXY Layer into CCE Platform Core
# Run from ~/cce-crypto: python3 ~/dxy_wire.py

# ============================================================================
# 1. index.js — require DXYLayer
# ============================================================================
idx = open('index.js').read()

idx = idx.replace(
    "const CCEBRKEngine   = require('./src/cce-brk-engine');",
    "const CCEBRKEngine   = require('./src/cce-brk-engine');\nconst DXYLayer       = require('./src/dxy-layer');"
)

# Add DXY init after engines start — pass to sharedNotifier
idx = idx.replace(
    "  // T.E Breakout — 1H volatility squeeze breakout engine",
    "  // Shared DXY Layer — initialise and expose to all engines\n  const dxyLayer = new DXYLayer(config, sharedNotifier);\n  config._dxyLayer = dxyLayer; // shared reference\n\n  // T.E Breakout — 1H volatility squeeze breakout engine"
)

open('index.js', 'w').write(idx)
print('index.js patched')

# ============================================================================
# 2. src/cce-engine.js — read DXY and update every cycle + apply to FSM
# ============================================================================
eng = open('src/cce-engine.js').read()

# Require DXYLayer at top of file
eng = eng.replace(
    "'use strict';",
    "'use strict';\nconst DXYLayer = require('./dxy-layer');"
)

# After BTC price logged, update DXY layer and read threshold
eng = eng.replace(
    "      this.lastBtcPrice  = marketData.btc_price || 0;\n      this.lastDominance = marketData.btc_dominance || 0;",
    """      this.lastBtcPrice  = marketData.btc_price || 0;
      this.lastDominance = marketData.btc_dominance || 0;

      // Update DXY layer if available
      if (this.config._dxyLayer && marketData.dxy_level) {
        await this.config._dxyLayer.update(marketData.dxy_level);
      }

      // Read DXY state for F&G threshold
      const dxyState = DXYLayer.readState();
      this.dxyRegime      = dxyState.regime;
      this.dxyFgThreshold = dxyState.fg_threshold;
      console.log(`[DXY] Regime: ${dxyState.regime} | F&G threshold: ${dxyState.fg_threshold} | Level: ${dxyState.level}`);"""
)

open('src/cce-engine.js', 'w').write(eng)
print('cce-engine.js patched')

# ============================================================================
# 3. src/strategy.js — apply DXY threshold to state machine
# ============================================================================
import os
strat_path = 'src/strategy.js'
if os.path.exists(strat_path):
    strat = open(strat_path).read()

    # Find DORMANT → ACCUMULATION F&G check and make it dynamic
    strat = strat.replace(
        'sentimentScore >= 60',
        'sentimentScore >= (engine.dxyFgThreshold || 60)'
    )
    strat = strat.replace(
        'signals.sentiment_score >= 60',
        'signals.sentiment_score >= (this.dxyFgThreshold || 60)'
    )

    open(strat_path, 'w').write(strat)
    print('strategy.js patched')
else:
    print('strategy.js not found — skipping (threshold applied in engine directly)')

# ============================================================================
# 4. src/cce-como-engine.js — expose DXY level to marketData
# ============================================================================
como = open('src/cce-como-engine.js').read()

# After DXY is fetched, also store it so crypto engine can read it
como = como.replace(
    "this.lastDxy = dxy;",
    "this.lastDxy = dxy;\n      if (this.config._dxyLayer) await this.config._dxyLayer.update(dxy);"
) if "this.lastDxy = dxy;" in como else como

open('src/cce-como-engine.js', 'w').write(como)
print('cce-como-engine.js patched')

print('\nDone! DXY Layer wired in.')
print('dxy_state.json will be written to ~/cce-crypto/data/ on first cycle.')
print('Check logs for: [DXY] Regime: NEUTRAL | F&G threshold: 60 | Level: 99.xx')
