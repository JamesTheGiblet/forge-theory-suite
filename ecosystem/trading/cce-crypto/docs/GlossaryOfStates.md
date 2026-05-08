# CCE State Glossary
### All Engine States — Plain English

---

## Universal States (all engines)

| State | Meaning |
|-------|---------|
| **DORMANT** | Conditions not met. 100% in cash/stablecoin. Waiting. This is not failure — it's discipline. |
| **WATCHING** | Conditions starting to build. Still no capital deployed. Engine is alert. |
| **STOPPED** | Circuit breaker triggered — daily loss limit hit. Resets next day. |

---

## S.E Crypto States

The flagship engine. Tracks BTC capital rotation cycle.

| State | Meaning |
|-------|---------|
| **DORMANT** | Bear market or no signal. 100% USDC. |
| **WATCHING** | Early signals building — BTC above SMA20, F&G recovering. |
| **IGNITION** | All conditions aligned. Capital deployed into BTC. |
| **CASCADE** | BTC profits rotating into broader crypto exposure. |
| **EXTRACTION** | Taking profit, returning to USDC. |

---

## S.E Forex States

EUR/USD oversold fade strategy.

| State | Meaning |
|-------|---------|
| **DORMANT** | No oversold signal or wrong session. |
| **WATCHING** | Z-score weakening, RSI dropping, London/NY session open. |
| **ACTIVE** | Fully oversold — position opened. |
| **EXITING** | Mean reversion complete — closing position. |

---

## S.E REIT States

Interest rate environment engine.

| State | Meaning |
|-------|---------|
| **DORMANT** | Rate environment hostile to REITs. |
| **WATCHING** | Fed pivot signals building. |
| **ACTIVE** | Rate environment favourable — position open. |

---

## S.E Stocks (CME) States

SPY equity regime engine.

| State | Meaning |
|-------|---------|
| **DORMANT** | Bear market or high volatility. |
| **WATCHING** | Bullish structure building — SMA crossover forming. |
| **ACTIVE** | Golden cross confirmed, low VIX — position open. |

---

## S.E Commodities (COMO) States

Oil → Gold → Copper cascade engine.

| State | Meaning |
|-------|---------|
| **DORMANT** | No commodity momentum signal. |
| **WATCHING** | Oil leading, gold following — early rotation. |
| **ACTIVE** | Full cascade confirmed — position open. |

---

## S.E EGP States

USD/EGP policy divergence engine.

| State | Meaning |
|-------|---------|
| **DORMANT** | No policy divergence signal. |
| **WATCHING** | CBE cutting while inflation rising. |
| **CAUTION** | Active divergence detected — alert mode. |

---

## T.E Grid States

BTC/USDC grid trading engine.

| State | Meaning |
|-------|---------|
| **DORMANT** | Grid not active. |
| **ACTIVE** | Grid placed — buy/sell orders at levels around centre price. |

---

## T.E Momentum States

EMA momentum engine.

| State | Meaning |
|-------|---------|
| **DORMANT** | No momentum signal. |
| **STANDBY** | EMA crossover pending confirmation. |
| **ACTIVE** | Momentum confirmed — position open. |
| **EXITING** | Momentum fading — closing position. |

---

## T.E Breakout States

Bollinger Band squeeze engine.

| State | Meaning |
|-------|---------|
| **DORMANT** | No squeeze detected. |
| **SCANNING** | Bollinger Bands tightening — squeeze building. |
| **TRIGGERED** | Breakout detected — position open. |
| **EXITING** | Target hit or stop triggered. |

---

## T.E LCE States

Liquidation cascade engine.

| State | Meaning |
|-------|---------|
| **DORMANT** | No liquidation signal. |
| **STALKING** | Liquidation levels building. |
| **TRIGGERED** | Cascade detected — position open. |
| **RIDING** | Riding the cascade momentum. |
| **EXITING** | Momentum exhausted — closing position. |

---

## O.E Observer States

| State | Meaning |
|-------|---------|
| **ACTIVE** | Continuously recording cross-engine snapshots every 15 minutes. |

---

## O.E Sentinel States

| State | Meaning |
|-------|---------|
| **ACTIVE** | Monitoring all engines for anomalies. |
| **ALERT** | Active anomaly detected — Telegram alert sent. |

---

## O.E Strategist States

| State | Meaning |
|-------|---------|
| **WAITING** | Fewer than 96 Observer cycles — not enough data. |
| **ACTIVE** | Analysing patterns hourly, generating recommendations. |

---

## G.O States

| State | Meaning |
|-------|---------|
| **WAITING** | Observer or Strategist not ready. |
| **OBSERVING** | Building 24-cycle baseline before making recommendations. |
| **ADVISORY** | Making capital ceiling recommendations (Tier 1). |

---

## What You See in Logs
[SE-CRY] ─── Cycle #47 @ 10:00:00 AM ───
[SE-CRY] 📊 DORMANT | F&G: 13 | BTC: $66,077
[SE-CRY] ⏳ Next run: 2:00:00 PM
[GRID] 🔄 #12 | BTC: $66,420 | State: ACTIVE
[GRID]    Centre: $66,526 | Profit: $0.00
[GRID]    Open buys: 5 | Open sells: 5
[G.O] 📊 Observing — baseline cycle 3/24
[G.O] 📋 Engines: 13 | Recommendations: 0
---

*Giblets Creations · v2.4.0 · March 2026*
