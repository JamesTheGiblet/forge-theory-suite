# S.E Pulse
### Mean Reversion Engine — BTC/USDC on Kraken

**Status:** 🟢 Running | **Mode:** DRY RUN | **Tier:** Starter
**File:** `engines/se-pulse/`
**Code:** SE-PLS

---

## Overview

S.E Pulse is a short-term BTC mean reversion engine. It hunts intraday dips of 2.5%+ from recent highs, enters a position, and exits when price recovers 1.5% or after 24 hours. Unlike other S.E engines it has no sentiment filter — it trades in any market condition, making it the most active engine on the platform.

---

## Strategy
BTC drops 2.5%+ from recent high
+ Volume confirms (1.2x average)
↓
BUY BTC/USDC
↓
Wait for recovery
↓
EXIT when:
Price recovers +1.5% (TARGET)
Price drops -4% further (STOP LOSS)
24 hours elapsed (TIMEOUT)
---

## States
SCANNING → LOADING  (dip ≥ 2.5% + volume confirmed)
LOADING  → HOLDING  (position opened)
HOLDING  → EXITING  (target / stop / timeout)
EXITING  → SCANNING (position closed, reset)
No DORMANT state — Pulse is always SCANNING.

---

## Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Capital | $150 USDC | Starting allocation |
| Dip threshold | -2.5% | Enter when BTC drops 2.5% from recent high |
| Target return | +1.5% | Take profit |
| Stop loss | -4.0% | Maximum loss per trade |
| Max hold | 24H | Force exit after 24 hours |
| Volume mult | 1.2x | Volume must be 1.2x 24H average |
| Max daily loss | 4% | Circuit breaker |

---

## Signal Logic

**Dip detection:**
Compares current BTC price to the highest price in the last 6 cycles (24H). If the drop exceeds the threshold the engine considers entry.

**Volume confirmation:**
Compares current 24H volume to rolling 6-cycle average. Elevated volume on a dip confirms genuine selling pressure — better mean reversion setup.

**Exit reasons:**
- `TARGET` — price recovered to +1.5%
- `STOP_LOSS` — price dropped further to -4%
- `TIMEOUT` — 24 hours held without hitting target or stop

---

## Expected Behaviour

| Market | Behaviour |
|--------|-----------|
| Ranging (BTC flat) | 3-5 trades/week on intraday swings |
| Bull trending | Frequent entries, fast exits on recovery |
| Bear trending | Stop losses triggered more often — normal |
| High volatility | Most active — dips and recoveries frequent |
| Low volatility | Quiet — waiting for 2.5% moves |

---

## Data Sources

- BTC/USDC price — Kraken public API
- 4H OHLC candles — Kraken public API
- 24H volume — Kraken ticker
- No external APIs required

---

## Integration

| System | Status |
|--------|--------|
| Engine Registry | ✅ Auto-loaded |
| O.E Observer | ✅ State captured |
| O.E Sentinel | ✅ 16 engines monitored |
| F.L Forensic | ✅ Trade history analysed |
| G.O Orchestrator | ✅ Scored 0.80 — highest on platform |
| CSS Siphon | ✅ pulse_trades table wired |
| Dashboard | ✅ Starter tier, Kraken badge |
| Telegram | ✅ Trade notifications |

---

## G.O Score

G.O scored Pulse at **0.80** on first cycle — the highest score on the platform. This is because:
- SCANNING state is treated as active by G.O
- No losses yet (clean drawdown score)
- Regime score elevated (mean reversion suits any regime)

G.O recommended a 20% ceiling increase on first cycle.

---

## Current Status (31 March 2026)

- State: SCANNING
- BTC dip: -2.44% (0.06% from entry threshold)
- Trades: 0 (just launched)
- Portfolio: $150.00

---

## Going Live Checklist

- [ ] Minimum 30 dry run cycles
- [ ] At least 5 complete trade cycles
- [ ] Win rate > 55% in dry run
- [ ] F.L Forensic has analysed trade patterns
- [ ] Max drawdown < 8% in dry run
- [ ] Kraken account has sufficient USDC

---

## Risk Notes

Pulse trades in ALL market conditions. In a sustained bear market it will hit more stop losses than targets. The 4% stop loss and 4% daily loss circuit breaker limit downside. Capital allocation of $150 is deliberately conservative for the first live run.

---

*Giblets Creations · v1.0 · March 2026*
*"I wanted it. So I forged it. Now forge yours."*
