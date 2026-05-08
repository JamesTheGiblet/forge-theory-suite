# S.E Forex
### Structure-First State Engine — Foreign Exchange

**Classification:** Internal · Proprietary  
**Asset Class:** Foreign Exchange (EUR/USD)  
**Cycle:** 1 hour  
**Status:** 🔵 Dry Run

---

## What Is S.E Forex?

S.E Forex is a Structure-First State Engine. It monitors the EUR/USD
currency pair and acts only when a specific combination of structural
and statistical conditions aligns. The name reflects its core principle:
market structure must be established before any action is considered.

Unlike trend-following systems that react to price movement, S.E Forex
waits for the market to reach a measurable extreme and then anticipates
the return toward equilibrium. It is a mean-reversion engine with strict
environmental filters.

---

## What It Pays Attention To

**Statistical Structure**
- Deviation of price from its statistical mean
- The magnitude of that deviation relative to recent volatility
- Whether the deviation is at an extreme worth fading

**Momentum Indicators**
- Trend strength and direction
- Momentum exhaustion signals

**Volatility**
- Current volatility relative to recent norms
- Whether conditions are suitable for a mean-reversion trade

**Session Context**
- Time of day and which trading session is active
- S.E Forex operates only during periods of sufficient liquidity
- Outside active sessions, the engine rests

---

## Behaviour

S.E Forex has a structure-first posture. It will not act during
off-hours when liquidity is thin and price movement is erratic.
It will not act when momentum is strongly trending in one direction.
It acts when price has moved to a statistical extreme during a liquid
session and momentum suggests the move is exhausted.

This means S.E Forex is often inactive. It cycles every hour but
spends most of its time in a scanning or resting state. This is by
design. A mean-reversion system that trades too frequently is a system
that accepts poor-quality setups. S.E Forex accepts only high-quality
setups.

**Cycle rhythm:** The 1-hour cycle aligns with session transitions
and the natural rhythm of intraday forex structure. It is fast enough
to identify setups within a session but slow enough to filter noise.

---

## Philosophy

S.E Forex operates on the principle that currency pairs spend most
of their time oscillating around an equilibrium, with periodic
excursions to extremes. Those extremes, when combined with session
context and momentum exhaustion, represent identifiable opportunities.

The engine does not ask where EUR/USD is going. It asks whether
EUR/USD is currently at an extreme, whether the session supports
a trade, and whether momentum suggests the extreme is running out
of energy. Only when all three answers are affirmative does the
engine consider acting.

The session filter is non-negotiable. Thin markets produce false
signals. S.E Forex respects market structure above all else.

---

## State Overview

S.E Forex operates through states representing:
- **Resting** — outside active sessions or conditions not met
- **Scanning** — session open, actively evaluating conditions
- **Engaged** — conditions met, position signalled
- **Managing** — in position, managing to target
- **Reviewing** — post-trade evaluation

The engine signals trades for manual execution on a retail platform.
It does not connect directly to a broker API in its current form.
Alerts are delivered via Telegram with entry, stop, and target levels.

---

## Risk Management

- **Session filter** — no trades outside liquid market hours
- **Volatility filter** — no trades in abnormal volatility conditions
- **Fixed risk per trade** — position sizing based on consistent
  risk percentage rather than arbitrary lot sizes
- **Structured exits** — partial profit-taking at predefined levels,
  trailing stop on remainder

---

*Giblets Creations · Internal Documentation · Not for distribution*

---

## Implementation Notes (v2.3.6)

**ATR Calculation**
ATR now uses Wilder smoothing on close-to-close differences rather than simple average. More accurate volatility estimate — simple average underestimates ATR by 30-40% in volatile sessions.

**Trade Direction**
Position direction now derived from signal: isOversold → BUY, isOverbought → SELL. Previously hardcoded to BUY only.

**Spread Cost Model**
Entry price now adjusted for spread cost (default 1.5 pips, configurable via spreadPips). BUY pays the spread, SELL receives less. rawPrice field preserved for reference.
