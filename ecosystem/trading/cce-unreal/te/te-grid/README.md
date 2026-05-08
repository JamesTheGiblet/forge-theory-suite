# T.E Grid
### Grid Tactical Engine — BTC/USDC

**Classification:** Internal · Proprietary  
**Asset Class:** Cryptocurrency (BTC/USDC)  
**Exchange:** Kraken  
**Cycle:** 5 minutes  
**Capital:** Dedicated allocation (separate from S.E Crypto)  
**Status:** 🔵 Dry Run

---

## What Is T.E Grid?

T.E Grid is the first Tactical Engine in the T.E Ecosystem. It deploys
a grid of buy and sell orders around the current BTC price and profits
from BTC oscillating between those levels.

It does not predict direction. It does not wait for macro conditions.
It simply places orders at mathematically defined levels and captures
the spread between them as price moves up and down through the grid.

---

## The Core Mechanic

A grid is a ladder of orders placed at regular intervals above and below
the current price:

```
$75,500  ← SELL
$75,000  ← SELL
$74,500  ← SELL
─────────── current price
$74,000  ← BUY
$73,500  ← BUY
$73,000  ← BUY
```

When price falls, buy orders fill. When price rises back up, sell orders
fill. Each completed buy→sell pair captures the spread between levels
as profit. The more BTC oscillates within the grid, the more profit
accumulates.

This is a purely mechanical process. No discretion. No prediction.
Orders sit at their levels and wait for price to come to them.

---

## What It Pays Attention To

**BTC Price** — to determine where to centre the grid and whether
orders have been filled

**Grid Drift** — whether price has moved far enough from the grid
centre to warrant rebuilding around the new price

**Stop Condition** — whether price has moved so far in one direction
that the grid should be cancelled to preserve capital

That is all. T.E Grid does not monitor sentiment, macro conditions,
or any external signals. It is a pure price-level mechanical system.

---

## Behaviour

T.E Grid checks market conditions every 5 minutes — significantly faster
than any S.E engine. On each check it:

1. Fetches current BTC price
2. Checks whether any orders have been filled
3. Logs completed buy→sell cycles and their profit
4. Replaces filled orders to maintain the grid
5. Checks whether the grid needs recentring
6. Checks whether the stop condition has been triggered

The engine manages itself completely. No manual intervention is required
during normal operation.

**Grid recentring:** If BTC price drifts significantly from the grid
centre, the engine cancels all open orders and rebuilds the grid around
the new price. This keeps the grid relevant to current market conditions.

**Stop condition:** If BTC falls sharply from the grid centre, the engine
cancels all orders and preserves remaining capital in USDC. This prevents
the grid from becoming one-sided in a strongly trending market.

---

## Capital Management

T.E Grid operates on a dedicated capital allocation completely separate
from the S.E Crypto engine. The two engines never share capital or
compete for the same USDC balance.

Capital is distributed evenly across all grid levels. Each level
represents an equal proportion of the total grid capital. This ensures
that no single level represents disproportionate risk.

---

## Philosophy

T.E Grid is built on the observation that BTC oscillates. Even in
strongly trending markets, BTC does not move in a straight line. It
advances, pulls back, advances again. In sideways markets, it oscillates
continuously within a range. This oscillation is the edge.

The grid does not need to know which direction BTC will trend over the
coming weeks. It only needs BTC to move up and down within its levels.
In trending markets, the grid recentres around the trend. In ranging
markets, the grid harvests the range. In both cases, activity generates
profit.

The risk is a sustained directional move that outpaces the grid's
ability to recentre. This is why the stop condition exists — to
recognise when the grid is fighting a trend and step aside.

---

## Performance Expectations

T.E Grid is a low-return, high-frequency engine. Individual cycle
profits are small — fractions of a dollar per completed buy→sell pair.
The cumulative effect of many small profits, reinvested, produces
meaningful returns over time.

This is not an engine for dramatic outperformance. It is an engine
for consistent, mechanical income generation. Its returns are
uncorrelated with the S.E engines — it generates activity regardless
of market conditions that would leave S.E engines dormant.

---

## Risk Profile

T.E Grid carries a different risk profile from the S.E engines:

- **Low per-trade risk** — each order represents a small fraction
  of total capital
- **Trending market risk** — strongly trending markets reduce grid
  efficiency and can leave capital concentrated on one side
- **Mitigation** — stop condition exits the grid when trend risk
  becomes unacceptable
- **Capital preservation** — stop triggers return capital to USDC,
  preserving the majority of the original allocation

---

*Giblets Creations · Internal Documentation · Not for distribution*

---

## Implementation Notes (v2.3.5)

**Slippage Model**
calcCycleProfit() now deducts slippage (0.1% per side) in addition to maker fees. Slippage configurable via slippageRate in config. More realistic profit accounting.

**Upside Runaway Protection**
shouldStop() now also triggers on upside runaway — if BTC rises 20%+ above grid centre, the grid recentres. Previously only checked downside. Configurable via runawayPct (default 0.20).
