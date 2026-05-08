# S.E Commodities
### Cross-Asset State Engine — Commodity Markets

**Classification:** Internal · Proprietary  
**Asset Class:** Commodities (Oil, Gold, Copper)  
**Primary Signal:** WTI Crude Oil  
**Cycle:** 24 hours  
**Status:** 🔵 Dry Run

---

## What Is S.E Commodities?

S.E Commodities is a Cross-Asset State Engine. It monitors relationships
between multiple commodity markets and the US Dollar, looking for a
specific pattern of sequential confirmation that historically precedes
sustained commodity moves.

Unlike single-asset engines, S.E Commodities does not act on the
movement of any one commodity in isolation. It requires a cascade of
confirmation — one asset must move, and then others must follow in
a predictable sequence. When the sequence is intact, the engine acts.
When the sequence breaks, the engine steps back.

---

## What It Pays Attention To

**Oil (Primary Signal)**
- WTI Crude Oil price and momentum
- Oil is the leading indicator in the commodity complex
- When oil moves significantly, it signals a macro shift that
  typically propagates through related assets

**Gold (First Confirmation)**
- Gold price and momentum relative to oil
- Gold responds to the same macro forces as oil but with a lag
- When gold confirms the oil move, the cascade is validating

**Copper (Second Confirmation)**
- Copper price and momentum relative to oil
- Copper is the industrial bellwether — its movement reflects
  real-economy demand expectations
- When copper confirms, the cascade has broad macro support

**US Dollar Index (Environmental Filter)**
- DXY measures the strength of the US Dollar against a basket
  of major currencies
- Commodities are priced in dollars — when the dollar strengthens,
  commodity prices face headwinds regardless of underlying demand
- S.E Commodities treats a strong dollar as a blocking condition
- When DXY is surging, the engine waits regardless of commodity signals

---

## The Cross-Asset Confirmation Principle

The core insight behind S.E Commodities is that commodity markets
are interconnected. Oil does not move in isolation. When oil makes
a significant directional move, it is reflecting a shift in macro
conditions — energy supply/demand, inflation expectations, geopolitical
factors — that affects all commodities.

But not all commodities respond simultaneously. There is a natural
lag structure:

1. **Oil moves first** — it is the most liquid, most traded commodity
   and reflects macro shifts fastest
2. **Gold follows** — as inflation expectations reprice, safe-haven
   and store-of-value demand adjusts
3. **Copper follows** — as industrial demand expectations adjust
   to the new energy price environment

This sequential pattern is the signal. A single commodity moving
in isolation could be idiosyncratic. All three moving in sequence,
with appropriate timing, is a macro event.

S.E Commodities waits for the sequence.

---

## Behaviour

S.E Commodities has a multi-stage confirmation requirement. The engine
advances through states as each stage of the cascade is confirmed:

**Stage 1:** Oil makes a significant move (magnitude threshold)  
**Stage 2:** Oil confirmation sustained (timing threshold)  
**Stage 3:** Gold begins following oil (lag confirmation)  
**Stage 4:** Copper begins following gold and oil (full cascade)

At each stage, the engine can retreat if conditions deteriorate.
If oil reverses, the engine returns to resting. If gold fails to
follow within its expected lag window, the engine abandons the trade.

The dollar filter operates at all stages. If DXY strengthens
significantly at any point, the engine pauses regardless of where
it is in the cascade sequence.

**Cycle rhythm:** Daily evaluation is appropriate for commodity
market structure. Commodity trends develop over weeks, not hours.
A daily cycle captures the signal without reacting to intraday noise.

---

## Philosophy

S.E Commodities is built on the principle that cross-asset confirmation
is more reliable than single-asset signals. A single commodity moving
could have a dozen explanations. Three commodities moving in sequence,
in the expected order, with appropriate timing, has one explanation:
a genuine macro shift is underway.

This is the cross-asset confirmation principle: wait for multiple
independent markets to agree before acting.

The dollar filter reflects a second principle: directional context
matters. A commodity signal in a weak-dollar environment has a
different probability profile than the same signal in a strong-dollar
environment. S.E Commodities does not ignore this context. It
incorporates it as a hard filter.

The combination of sequential confirmation and directional context
filter produces a system that acts rarely but with high conviction
when it does act.

---

## State Overview

S.E Commodities operates through states representing:
- **Resting** — no commodity trend or dollar blocking, capital in cash
- **Watching** — oil moving significantly, monitoring for cascade
- **Rotating** — oil confirmed, gold lag window open
- **Cascading** — gold confirmed, copper lag window open
- **Holding** — full cascade confirmed, position active
- **Exiting** — cascade breaking down, rotating back to cash

---

## Risk Management

- **Dollar filter** — hard block when DXY is surging
- **Sequential requirement** — cannot skip stages of the cascade
- **Lag windows** — each stage has a maximum time to confirm,
  after which the engine abandons the trade
- **Momentum exit** — oil momentum failure triggers exit
- **Maximum hold** — no position held indefinitely

---

*Giblets Creations · Internal Documentation · Not for distribution*

---

## Implementation Notes (v2.3.6)

**Oil/Gold Correlation Gate**
Gold confirmation now requires Oil/Gold correlation > 0.3 in addition to price momentum. When correlation is negative (gold moving independently of oil), the goldFollowing signal is suppressed regardless of price action. This prevents false cascade confirmations during regime divergence — as seen in March 2026 when Oil/Gold correlation dropped to -0.57.

**Signal Validation**
All input signals now validated with safe defaults. oilBearish is computed explicitly in the signal layer (oilMom5d < -3.0%) rather than being a hidden data feed dependency.
