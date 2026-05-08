# CCE Config Reference
### config.js — Full Parameter Reference

**File:** `~/cce-crypto/config.js`
**Last updated:** 31 March 2026 — v2.4.0

---

## System

```javascript
system: {
  name:        'Cascade Compounding Engine',
  version:     '2.4.0',
  environment: 'production'
}
Trading (S.E Crypto)
trading: {
  startingCapital:     521.83,  // Real Kraken balance
  baseCurrency:        'USD',
  maxPositionSizePct:  40,      // Max 40% per position
  circuitBreakerPct:   -20,     // Emergency stop at -20%
  minTradeValue:       10       // Minimum trade size $10
}
Execution
execution: {
  checkIntervalHours: 4,         // S.E Crypto cycle
  enableAutoTrading:  true,
  dryRun:             false      // LIVE on S24, true on VPS
}
S.E Engines (Broker)
forex: {
  enabled: true, dryRun: true,
  pair: 'EURUSD=X', startingCapital: 300, intervalHours: 1
}

rme: {
  enabled: true, dryRun: true,
  symbol: 'O', startingCapital: 300, intervalHours: 24
}

cme: {
  enabled: true, dryRun: true,
  symbol: 'SPY', startingCapital: 300, intervalHours: 24
}

como: {
  enabled: true, dryRun: true,
  startingCapital: 300, intervalHours: 24
}

egp: {
  enabled: true, dryRun: true,
  intervalMinutes: 10080,  // Weekly
  cbeRate: 19, inflation: 13.4
}
S.E Engines (Kraken — Registry)
fearFade: {
  enabled:        true,
  dryRun:         true,
  capitalUSDC:    100,
  entryFearGreed: 20,   // Buy when F&G <= 20
  watchFearGreed: 30,   // Watch when F&G <= 30
  exitFearGreed:  60,   // Sell when F&G >= 60
  stopLossPct:    -15,
  takeProfitPct:  40,
  maxDailyLoss:   0.03
}

goldForge: {
  enabled:        true,
  dryRun:         true,
  capitalUSDC:    100,
  entryFearGreed: 25,   // Buy XAUT when F&G <= 25
  watchFearGreed: 35,
  exitFearGreed:  55,
  entryGoldMom:   0.5,  // Gold must be rising > 0.5%
  stopLossPct:    -8,
  takeProfitPct:  20,
  maxDailyLoss:   0.03
}

altSeason: {
  enabled:          true,
  dryRun:           true,
  capitalUSDC:      100,
  entryDominance:   52,  // Watch when BTC dom < 52%
  activeDominance:  50,  // Rotate when BTC dom < 50%
  exitDominance:    55,  // Exit when BTC dom > 55%
  stopLossPct:      -20,
  takeProfitPct:    50,
  maxDailyLoss:     0.03
}

underdog: {
  enabled:        true,
  dryRun:         true,
  capitalUSDC:    200,  // $50 per asset (4 assets)
  entryFearGreed: 20,
  watchFearGreed: 35,
  exitFearGreed:  60,
  entryDominance: 54,   // BTC dom must be < 54%
  exitDominance:  58,
  stopLossPct:    -25,
  takeProfitPct:  60,
  maxDailyLoss:   0.03
}
T.E Engines
grid: {
  enabled: true, dryRun: true,
  capitalUSDC: 125, spacing: 0.01, levels: 10,
  intervalMinutes: 5, stopLossPct: 0.15, recentrePct: 0.05
}

mom: {
  enabled: true, dryRun: true,
  capitalUSDC: 125, pairs: ['BTC/USDC','ETH/USDC','SOL/USDC'],
  intervalMinutes: 120, maxPositions: 2,
  emaFast: 9, emaSlow: 21, emaTrend: 50
}

brk: {
  enabled: true, dryRun: true,
  capitalUSDC: 100, pairs: ['BTC/USDC','ETH/USDC','SOL/USDC'],
  intervalMinutes: 60, maxPositions: 2,
  bbPeriod: 20, bbStdDev: 2, squeezePct: 0.02
}

lce: {
  enabled: true, dryRun: true,
  capitalUSDC: 100, intervalMinutes: 5,
  minLiqUsd5m: 5000000, stopLossPct: 0.8, takeProfitPct: 1.6
}
O.E Engines
obs: {
  enabled: true,
  intervalMinutes: 15,
  patternInterval: 96   // Pattern analysis every 96 obs
}

sentinel: {
  enabled: true,
  intervalMinutes: 15
}

str: {
  enabled: true,
  intervalMinutes: 60,
  totalCapital: 516
}
G.O Orchestrator
go: {
  enabled:         true,
  dryRun:          true,
  tier2Enabled:    false,
  tier3Enabled:    false,
  allowLiveAdjust: false,
  minCeilingPct:   0.2,
  maxCeilingPct:   2,
  maxSingleAdjust: 0.2,
  minPlatformPct:  0.6
}
Client Tier Gating
# .env
CCE_CLIENT_TIER=starter    # Kraken only
CCE_CLIENT_TIER=advanced   # + Binance
CCE_CLIENT_TIER=full       # All exchanges
# (unset) = full platform
Environment Variables
# Exchange
KRAKEN_API_KEY=xxx
KRAKEN_API_SECRET=xxx

# Notifications  
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx

# Platform
CCE_DRY_RUN=false
STARTING_CAPITAL=521.83
CCE_CLIENT_TIER=           # blank = full platform
LICENCE_KEY=DEV

# Data feeds
WEATHER_API_KEY=xxx
FRED_API_KEY=xxx
Giblets Creations · v2.4.0 · March 2026
