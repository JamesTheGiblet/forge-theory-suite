# S.E Crypto
### Compounding State Engine — Cryptocurrency Markets

**Classification:** Internal · Proprietary  
**Asset Class:** Cryptocurrency (BTC/USDC)  
**Exchange:** Kraken  
**Cycle:** 4 hours  
**Status:** 🟢 Live — v2.3.8

---

## What Is S.E Crypto?

S.E Crypto is a Compounding State Engine — the flagship engine of the
S.E Ecosystem. It monitors the cryptocurrency market and deploys capital
through a sequence of states that correspond to phases of the crypto
market cycle.

The defining characteristic of S.E Crypto is its compounding structure.
Capital is not held static — it is repositioned through successive market
phases, each one building on the returns of the last. The name reflects
this: the engine cascades through phases, compounding at each stage.

---

## What It Pays Attention To

S.E Crypto observes a set of market environment signals on every 4-hour
cycle. These signals collectively describe the state of the cryptocurrency
market:

**Price Structure**
- BTC price relative to key moving averages
- Trend direction and momentum

**Sentiment**
- Fear & Greed Index (0-100)
- Market psychology as a leading indicator

**Capital Flows**
- BTC Dominance — the proportion of total crypto market cap held in Bitcoin
- When BTC dominance shifts, capital is rotating between assets

**Macro Confirmation** (optional)
- ETF flow data
- Institutional sentiment indicators

---

## Behaviour

S.E Crypto has a defensive posture by default. It begins in a capital-
preservation state and only deploys when multiple environmental signals
align. It will not act on a single signal. It requires confirmation.

When conditions deteriorate, it steps back. When conditions improve
gradually, it steps forward incrementally. This incremental approach
reduces the impact of false signals and whipsawing markets.

The engine is designed for asymmetric upside — it aims to be
well-positioned when large moves occur and to be flat during uncertain
or hostile conditions.

**Cycle rhythm:** The engine evaluates conditions every 4 hours, aligning
with the 4-hour candle structure that institutional participants use.
This is not coincidental. The 4H timeframe filters noise while remaining
responsive to meaningful market shifts.

---

## Philosophy

S.E Crypto embodies the core principle of the S.E Ecosystem: environment
first, action second.

The engine will not deploy capital simply because time has passed. It will
not deploy capital because price has moved. It deploys capital when the
environment — as described by the combination of signals it monitors —
reaches a state that historically precedes the kind of move the engine
is designed to capture.

In extreme fear environments (Fear & Greed below 20), S.E Crypto holds
cash. Not because it predicts further decline, but because the environment
does not support deployment. When fear becomes extreme, it means the
market is in a state of dislocation — and dislocated markets are
unpredictable. The engine waits for order to return.

---

## State Overview

S.E Crypto operates through a sequence of states representing progressive
market engagement. States are not disclosed in this document to protect
proprietary logic. What can be described:

- There is a **resting state** where capital is fully preserved
- There are **transitional states** representing graduated deployment
- There is a **maximum deployment state** for confirmed bull conditions
- There are **defensive states** that lock in gains during late-cycle phases
- There is an **emergency state** that exits all positions on severe deterioration

The engine moves forward through states as conditions improve, and
backward as they deteriorate. It never skips states. It never rushes.

---

## Risk Management

S.E Crypto incorporates several risk management mechanisms:

- **Capital preservation by default** — cash is the default position
- **Circuit breaker** — severe drawdown triggers immediate exit to cash
- **Trailing protection** — gains are locked progressively as price advances
- **Sentiment ceiling** — extreme greed triggers profit-taking
- **Pre-flight validation** — engine refuses to start if internal tests fail

These mechanisms operate automatically. No manual intervention is required
or expected.

---

## Performance Context

S.E Crypto has been backtested against 13 years of historical data
(2013-2026). The backtest demonstrates significant outperformance versus
a buy-and-hold strategy, with substantially reduced maximum drawdown.

Live deployment began March 2026. Performance is monitored via the
Forge HQ dashboard and reported via Telegram.

Backtested results do not guarantee future performance. Live results
may differ from backtest results due to fees, slippage, and market
conditions not represented in historical data.

---

*Giblets Creations · Internal Documentation · Not for distribution*

---

## Implementation Notes (v2.3.x)

**Signal Fixes (v2.3.1)**
Three previously hardcoded signals now calculated from real data:
- `btc_5_percent_drop` — computed from 24H OHLCV (last 2 daily closes)
- `btc_d_rising_sharply` — rolling 30-cycle dominance history, fires when dominance rises 1.5%+ above 3-cycle average
- `alt_season_index_above_75` — approximated as BTC dominance < 45%

**Fee & Slippage Model (v2.3.2)**
Rebalancer now applies 0.16% Kraken maker fee + 0.1% slippage to all trade actions. Buy actions adjusted upward, sell actions adjusted downward. Each action includes `grossValue` and `estimatedCost` fields.

**Confidence Layer (v2.3.3)**
State transitions now include a confidence score (0-1) and signal drivers list. Useful for STR pattern analysis and transition audit trail.
