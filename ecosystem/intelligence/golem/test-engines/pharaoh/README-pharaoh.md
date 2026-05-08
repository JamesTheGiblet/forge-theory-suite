# pharaoh.js — Main Engine

## Purpose
The core trading engine that runs the Pharaoh strategy.

## Key Functions

| Function | Purpose |
|----------|---------|
| `safetyCheck()` | 4-layer safety system before live trading |
| `fetchXRPPrice()` | Gets XRP/USDC price from Kraken |
| `fetchFearGreed()` | Gets Fear & Greed Index |
| `fetchBTCDominance()` | Gets BTC dominance from CoinGecko |
| `shouldEnter()` | Checks all 5 entry conditions |
| `shouldExit()` | Checks exit conditions |
| `buyXRP()` / `sellXRP()` | Executes trades on Kraken |
| `runCycle()` | Main loop — runs every 6 hours |

## Safety System (4 Locks)

| Lock | Requirement |
|------|-------------|
| 1 | `SAFETY_LOCK` file must be removed |
| 2 | `.LIVE` file must exist |
| 3 | `LIVE=true` environment variable |
| 4 | Manual confirmation phrase |

## State Machine

| State | Description |
|-------|-------------|
| DORMANT | Waiting for F&G ≤ 25 |
| WATCHING | Monitoring entry conditions |
| LOADED | Position opened |
| HOLDING | Position held, monitoring exit |
| EXITING | Position closed |
| STOPPED | Circuit breaker triggered |

## Usage

```bash
# Dry run (safe)
node pharaoh.js

# Live (requires all 4 locks)
LIVE=true node pharaoh.js
```

