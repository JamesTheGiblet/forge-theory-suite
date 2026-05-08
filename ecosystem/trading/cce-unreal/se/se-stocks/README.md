# S.E Stocks
### Volatility-Aware State Engine — Equity Markets

**Classification:** Internal · Proprietary  
**Asset Class:** US Equities (S&P 500)  
**Instrument:** SPDR S&P 500 ETF (SPY)  
**Cycle:** 24 hours  
**Status:** 🔵 Dry Run

---

## What Is S.E Stocks?

S.E Stocks is a Volatility-Aware State Engine. It monitors US equity
market conditions and deploys capital when the environment is characterised
by low volatility, confirmed trend structure, and broad market participation.
When volatility is elevated or trend structure is absent, the engine rests.

The volatility-aware designation is intentional. Equity markets operate
in distinct volatility regimes — low-volatility trending environments
and high-volatility dislocated environments. These regimes have different
risk profiles and require different approaches. S.E Stocks is designed
specifically for the former.

---

## What It Pays Attention To

**Volatility Regime**
- The VIX (CBOE Volatility Index) — the primary environmental filter
- VIX measures the market's expectation of near-term volatility
- S.E Stocks operates only in low-volatility environments
- When VIX is elevated, the engine treats the environment as hostile

**Trend Structure**
- Price position relative to key long-term moving averages
- The relationship between short-term and long-term trend indicators
- Whether the market is in a structurally bullish or bearish regime

**Market Breadth**
- The proportion of S&P 500 stocks participating in the trend
- Broad participation indicates a healthy, sustainable move
- Narrow participation (few stocks driving the index) is a warning sign
- S.E Stocks requires broad confirmation before acting

**Momentum**
- Price momentum over recent weeks
- Whether momentum is building (favourable) or fading (cautious)

**Volume**
- Whether institutional participation is confirming price movement
- Price moves without volume are suspect
- S.E Stocks requires volume confirmation for entry

---

## Behaviour

S.E Stocks has a deliberate, multi-condition entry requirement.
It will not act when VIX is elevated — this is non-negotiable.
High volatility regimes are environments where trend analysis
becomes unreliable, breadth divergences are common, and
false breakouts are frequent. The engine simply waits.

When VIX is low, the engine begins evaluating the other conditions.
Trend structure must be confirmed. Volume must be participating.
Breadth must be healthy. Momentum must be building. Only when
this full set of conditions aligns does S.E Stocks advance.

**The patience of S.E Stocks is not a bug. It is the edge.**

Most equity market losses occur when participants chase moves in
high-volatility environments, or buy into trends that lack breadth
confirmation. S.E Stocks refuses to do either.

**Cycle rhythm:** Daily evaluation matches the natural pace of
equity market structure. Institutional participants operate on
daily and weekly timeframes. Daily data provides the signal
fidelity S.E Stocks requires without the noise of intraday movement.

---

## Philosophy

S.E Stocks is built on a simple observation: equity markets spend
more time in low-volatility trending regimes than in high-volatility
dislocated regimes. The low-volatility trending regime is when the
market rewards participation. The high-volatility dislocated regime
is when the market punishes it.

A system that can accurately distinguish between these regimes —
and deploy capital only in the favourable one — has a structural
advantage over systems that are always deployed.

VIX is the primary tool for this distinction. When VIX is low,
the market is calm. Calm markets trend. Calm markets reward
participation. When VIX is high, the market is dislocated.
Dislocated markets are unpredictable. S.E Stocks steps back.

The rest of the conditions — trend, breadth, volume, momentum —
exist to filter within the low-volatility regime, identifying
the specific phase of the trend where the risk/reward is most
favourable.

---

## State Overview

S.E Stocks operates through states representing:
- **Resting** — VIX elevated or trend structure absent, capital in cash
- **Watching** — VIX calm, trend structure forming, monitoring
- **Ready** — conditions nearly complete, preparing for deployment
- **Deployed** — full conditions met, capital in position
- **Holding** — in position, monitoring for deterioration
- **Exiting** — environment shifting, rotating back to cash

---

## Risk Management

- **VIX threshold** — hard filter, no deployment above defined level
- **Trend confirmation** — multiple timeframe alignment required
- **Breadth requirement** — broad participation must be confirmed
- **Dynamic stop** — position protected by trailing technical level
- **Overbought ceiling** — extreme momentum triggers profit-taking
- **Structural exit** — trend breakdown triggers immediate exit

---

*Giblets Creations · Internal Documentation · Not for distribution*

---

## Implementation Notes (v2.3.7)

**Signal Validation**
getAllSignals() now validates all inputs with safe defaults. vixElevated signal added (VIX 20-25) — was used in FSM state transitions but previously undefined in the signal layer. vixLow/vixHigh now computed from validated VIX value.

**Stack Overflow Protection**
getDrawdownFromPeak() now uses reduce() instead of spread operator for peak calculation — prevents stack overflow on large price arrays.
