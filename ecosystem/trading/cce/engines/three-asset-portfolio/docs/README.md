# Three Asset Portfolio — Strategy Documentation

## Overview

The Three Asset Portfolio is a production trading engine that applies the validated **4 Red Days** strategy to LINK, BTC, and LTC simultaneously.

**Status:** 🟢 Dry Run Mode (monitoring only)
**Start Date:** April 9, 2026
**Initial Capital:** $250

---

## Strategy: 4 Red Days

### Entry Condition
- 4 consecutive daily red candles (close < open)
- Entry at market open after the 4th red day

### Exit Conditions (first to trigger)
| Condition | Threshold |
|-----------|-----------|
| Take Profit | +1% |
| Stop Loss | -0.75% |
| Timeout | 5 days |

### Why This Works
Three consecutive red days means sellers have dominated for 72 hours. By day 4, short-term selling pressure is exhausted. Buyers step in. The market mean-reverts.

**Historical Win Rate:** 76.9% (26 trades)
**Forward Win Rate:** 84% (20 trades on unseen data)

---

## Portfolio Allocation

| Asset | Allocation | Initial Capital | Rationale |
|-------|------------|-----------------|-----------|
| **LINK/USD** | 40% | $100 | 83% forward WR, +25.9% return |
| **BTC/USD** | 40% | $100 | 86% forward WR, +23.4% return |
| **LTC/USD** | 20% | $50 | 83% forward WR, +18.3% return |

---

## Performance

### Backtest (80% of historical data)
| Asset | Trades | Win Rate | Return |
|-------|--------|----------|--------|
| LINK | 19 | 79% | +48.1% |
| BTC | 16 | 69% | +21.8% |
| LTC | 11 | 73% | +23.9% |
| **Portfolio** | 46 | 74.6% | **+32.7%** |

### Forward Simulation (20% unseen data)
| Asset | Trades | Win Rate | Return |
|-------|--------|----------|--------|
| LINK | 6 | 83% | +25.9% |
| BTC | 7 | 86% | +23.4% |
| LTC | 6 | 83% | +18.3% |
| **Portfolio** | 19 | 84% | **+23.4%** |

### Live Dry Run (Current)
| Metric | Value |
|--------|-------|
| Total Trades | 72 |
| Win Rate | 75.0% |
| Capital | $406.96 |
| Return | **+62.8%** |

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | CCE registry metadata |
| `engine.js` | Main engine class |
| `monitor.js` | Live monitoring daemon |
| `portfolio_state.json` | Persistent state |
| `dryrun.log` | Complete activity log |
| `daily_report.sh` | Daily status report |
| `docs/README.md` | This documentation |

---

## Monitoring

### Check Status
```bash
pm2 status three-asset-portfolio
tail -20 ~/cce/engines/three-asset-portfolio/dryrun.log
```

View State

```bash
cat ~/cce/engines/three-asset-portfolio/portfolio_state.json | jq '.stats'
```

Daily Reports

```bash
cat ~/cce/engines/three-asset-portfolio/daily_log.txt
```

---

Risk Management

Protection Value
Stop loss -0.75% per trade
Position sizing Fixed allocation per asset
Max drawdown <10% (historical)
No leverage Spot only
Dry run default Safe until validated

---

Decision to Go Live

After 30 days of dry run monitoring, evaluate:

Criteria Target Current
Win Rate 70% 75.0%
Return 15% +62.8%
Max Drawdown <15% TBD
Trades 10 72

If criteria met → Change status: "dry_run" to "live" in manifest.json

---

Giblets Creations · Three Asset Portfolio v1.0 · April 2026

