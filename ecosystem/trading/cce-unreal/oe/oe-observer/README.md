# O.E Observer
### Platform Watchdog — Passive Intelligence Engine

**Classification:** Internal · Proprietary  
**Cycle:** 15 minutes  
**Status:** 🟢 Active

---

## What Is O.E Observer?

O.E Observer is the platform's memory. It runs every 15 minutes,
takes a complete snapshot of every engine state and every market
condition, and stores everything in its own database. It never
interferes with anything. It only watches and records.

Over time, those snapshots become a dataset. That dataset becomes
patterns. Those patterns become intelligence. That intelligence
eventually powers the O.E Strategist and the G.O.

The Observer is the foundation everything else will be built on.

---

## What It Watches

Every 15 minutes the Observer records:

**Engine States**
- S.E Crypto current state
- S.E Forex current state
- S.E REIT current state
- S.E Stocks current state
- S.E Commodities current state
- T.E Grid current state and profit

**Crypto Market**
- BTC price
- BTC dominance
- Fear & Greed Index
- Portfolio value

**Forex**
- EUR/USD rate
- Z-score deviation
- RSI

**Rate Environment**
- Federal Funds Rate
- 10Y Treasury yield
- Yield spread

**Equities**
- SPY price
- VIX volatility index
- RSI, SMA50, SMA200

**Commodities**
- WTI Crude Oil
- Gold
- Copper
- DXY (US Dollar Index)

---

## What It Detects

Beyond passive snapshots, the Observer actively monitors for
state transitions across all engines. When any engine changes
state, the Observer records the exact market conditions at
that moment — creating a labelled dataset of:

*"Engine X transitioned from State A to State B when market
conditions were Y."*

Over hundreds of observations, this builds a picture of what
market conditions actually precede each state transition. This
is the raw material for pattern recognition.

---

## Behaviour

The Observer is completely passive. It has no state machine of its
own in the trading sense — it simply runs on a fixed 15-minute
cycle and records. It cannot be paused by market conditions. It
cannot be triggered early. It does not respond to signals.

It runs. It records. It waits. It runs again.

**Pattern analysis** triggers automatically every 96 observations
(approximately 24 hours). At that point the Observer analyses all
accumulated data and generates insights — state duration averages,
transition condition summaries, engine co-activity correlation.

**Daily summaries** are generated at midnight and sent via Telegram.

**Weekly pattern reports** are sent after 7 days of accumulated data.

---

## The Dataset It Builds

After 30 days of operation the Observer will have produced:

- ~2,880 observation snapshots
- Complete state history for all 6 engines
- Market conditions at every state transition
- Engine co-activity correlation matrix
- State duration statistics
- Market regime distribution

This is the dataset the O.E Strategist will analyse. It is also
the historical record that validates — or challenges — the
assumptions built into each state engine.

---

## What It Does Not Do

The Observer never:
- Calls any engine method
- Writes to any engine database
- Sends signals to any engine
- Influences any trading decision
- Allocates or moves capital

These constraints are architectural. The Observer holds read-only
references to engine state properties. It has no pathway to
affect engine behaviour even if it wanted to.

---

## Storage

The Observer maintains its own database: `obs-production.db`

Tables:
- `observations` — full 15-minute snapshots
- `state_transitions` — detected transitions with market context
- `patterns` — generated pattern analyses
- `daily_summaries` — end-of-day summaries

---

## Dashboard

The Observer panel is visible at localhost:3000, scrolled to the
bottom of the main dashboard. It shows:

- Total observations recorded
- Last and next observation time
- Countdown to next pattern analysis
- Latest engine state snapshot
- Observed transitions table
- Pattern insights (populated after 96 observations)

---

*Giblets Creations · Internal Documentation · Not for distribution*

---

## Implementation Notes (v2.3.x)

**Engine Coverage (updated)**
Observer now tracks all 11 engines:
S.E: Crypto, Forex, REIT, Stocks, Commodities, EGP
T.E: Grid, Momentum, Breakout, LCE
O.E: Sentinel (anomaly counts)

**Dataset Projection (updated)**
After 30 days: ~2,880 snapshots, complete state history for all 11 engines, engine co-activity correlation matrix (11×11), state duration statistics, market regime distribution across 5 regimes × 3 volatility bands.

**Regime-Aware Pattern Analysis**
Pattern matching now filters by macro regime before comparing observations. Bull market patterns no longer contaminate bear market analysis. Regimes: EXTREME_FEAR / FEAR / NEUTRAL / GREED / EXTREME_GREED combined with HIGH_VOL / MED_VOL / LOW_VOL.

**Correlation Insights**
Pattern analysis generates correlation insights for engine pairs active simultaneously ≥20% of the time.
