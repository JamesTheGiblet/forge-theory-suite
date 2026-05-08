# O.E Strategist
### Pattern Analysis & Recommendation Engine — Platform Intelligence Layer

**Classification:** Internal · Proprietary
**Type:** Observer Engine (passive — does not trade)
**Cycle:** 1 hour
**Status:** ⏳ Waiting — enables after 96 Observer cycles (~24 hours)

---

## What Is O.E Strategist?

O.E Strategist is the analytical brain of the O.E Ecosystem. Where
O.E Observer records and O.E Sentinel alerts, O.E Strategist thinks.

It reads the accumulated observation dataset built by O.E Observer,
identifies recurring patterns across engines and markets, and generates
strategic recommendations for the platform operator.

Strategist is still passive — it never trades, never allocates capital,
and never modifies engine behaviour. It produces intelligence. The
operator acts on it.

---

## Why Strategist Exists

Raw observation data is valuable but not actionable on its own. After
days and weeks of operation, O.E Observer accumulates hundreds of
snapshots showing engine states, market conditions, and transitions.
Patterns exist in that data — but they require analysis to surface.

Strategist is the engine that performs that analysis. It asks:

- Which market conditions most reliably precede profitable engine states?
- Which engine combinations are historically active simultaneously?
- How does platform performance correlate with macro conditions?
- What allocation adjustments would improve expected returns?
- Are there market regimes where certain engines consistently underperform?

These questions cannot be answered by any individual engine. They require
a view across the entire platform history. That is Strategist's domain.

---

## Why It Waits for 96 Observations

Strategist requires a minimum dataset before its analysis is meaningful.
96 observations from O.E Observer represents approximately 24 hours of
continuous platform operation — enough to capture multiple cycles of
each engine and a representative sample of market conditions.

Running pattern analysis on fewer observations produces unreliable
conclusions. The 96-observation threshold ensures the recommendations
Strategist generates are grounded in sufficient data.

Once enabled, Strategist runs every hour and updates its recommendations
as the dataset grows.

---

## What It Produces

**Pattern Reports**
- Recurring state sequences across engines
- Market condition clusters that precede transitions
- Cross-engine correlation analysis

**Allocation Recommendations**
- Suggested capital weighting adjustments per engine
- Confidence scores based on historical pattern strength
- Risk-adjusted return estimates per allocation scenario

**Regime Analysis**
- Current market regime classification
- Historical performance of each engine in this regime
- Expected duration and transition probability

**Briefing Command**
The `/briefing` command generates a plain-English summary of current
platform intelligence — designed to be read in under 2 minutes.

---

## Relationship to G.O (Grand Orchestrator)

Strategist is the precursor to G.O — the Grand Orchestrator planned
for a future phase of the platform. G.O will eventually act on
Strategist's recommendations autonomously, adjusting capital ceilings
across engines without operator input.

Until G.O is built, Strategist's recommendations are advisory only.
The operator reads them and decides whether to act.

```
Current state:
O.E Observer  →  O.E Strategist  →  Operator decision  →  Manual adjustment

Future state:
O.E Observer  →  O.E Strategist  →  G.O  →  Automatic adjustment
```

---

## The Golden Rule

**Strategist never affects engine behaviour.**

It reads only from the Observer database. It writes only to its own
database and the Telegram notification channel `[STR]`. It has no
mechanism to modify, pause, or override any engine.

---

## Enabling Strategist

Strategist is disabled by default and enables automatically once
O.E Observer reaches 96 observations. To enable manually:

In `config.js`, set:
```js
str: {
  enabled: true,
  intervalMinutes: 60,
}
```

Restart `cce-bot` to activate.

---

## Storage

Strategist maintains its own database with:
- Pattern analysis results per observation window
- Recommendation history with confidence scores
- Regime classification log
- Briefing generation history

---

*Giblets Creations · Internal Documentation · Not for distribution*
*"I wanted it. So I forged it. Now forge yours."*

---

## Implementation Notes (v2.3.4)

**Regime-Aware Pattern Matching**
_findSimilarConditions() now filters by macro regime before pattern matching. Patterns are only compared within the same sentiment regime (EXTREME_FEAR / FEAR / NEUTRAL / GREED / EXTREME_GREED) AND the same volatility regime (HIGH_VOL / MED_VOL / LOW_VOL). F&G similarity window widened to ±10 within regime. Bull market patterns no longer contaminate bear market analysis.
