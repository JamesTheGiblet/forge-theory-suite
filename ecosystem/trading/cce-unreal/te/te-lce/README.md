# T.E LCE
### Liquidation Cascade Engine — Crypto Futures Markets

**Classification:** Internal · Proprietary
**Asset Class:** Cryptocurrency (BTC, ETH, SOL)
**Exchange:** Kraken (execution) · Binance Futures (signal data)
**Cycle:** 5 minutes
**Capital:** $100 USDC
**Status:** 🔵 Dry Run

---

## What Is T.E LCE?

T.E LCE is the Liquidation Cascade Engine — the fourth Tactical Engine
in the T.E Ecosystem. It detects and rides liquidation cascades in the
crypto futures market.

A liquidation cascade occurs when a large cluster of overleveraged
positions gets forcibly closed by exchanges. The forced selling (or
buying) creates a sharp, directional price spike in the minutes that
follow. T.E LCE detects this event as it happens and enters a position
to ride the continuation move.

The thesis in one line: **other traders' pain is your signal.**

---

## Why Liquidation Cascades Work

Crypto futures markets allow traders to use leverage — often 10x, 20x,
or more. When price moves against a leveraged position by enough, the
exchange automatically closes it to protect itself. This forced closure
is called a liquidation.

When many positions are liquidated simultaneously — a cascade — the
forced buying or selling amplifies the price move. The cascade creates
its own momentum. Prices overshoot. The move continues beyond what
fundamentals would justify for 5-30 minutes.

This overshoot is the edge. T.E LCE enters at the start of the
continuation and exits before the reversion.

---

## What It Pays Attention To

T.E LCE monitors three data sources on every 5-minute cycle:

**Liquidation Volume (Binance Futures)**
- Total USD liquidated in the last 5 minutes
- Total USD liquidated in the last 15 minutes
- Dominant side (longs or shorts being wiped)

**Open Interest Delta (Binance Futures)**
- Current open interest vs previous 5-minute snapshot
- A significant OI drop confirms real liquidations occurred
- Distinguishes genuine cascade from normal volatility

**Price Momentum (Kraken)**
- 5-minute OHLCV candles
- RSI (14-period) — filters out already-exhausted moves
- Momentum % — confirms price is moving in cascade direction

---

## The Five States

```
DORMANT    No significant liquidation activity detected.
           Engine is scanning, no position open.

STALKING   A significant liquidation spike detected ($5M+ in 5min).
           Engine is watching for cascade confirmation.
           Maximum 15 minutes in this state before returning to DORMANT.

TRIGGERED  Cascade confirmed across all three signal layers.
           Trade entry decision made. Awaiting position fill.

RIDING     Position open. Engine managing stop loss and take profit.
           Trailing stop activates once 0.5% profit reached.
           Maximum 30 minutes in any trade.

EXITING    Position closed. 10-minute cooldown before next hunt.
           Returns to DORMANT after cooldown.
```

---

## Entry Conditions

All four conditions must be met simultaneously:

| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| 15-min liquidation volume | ≥ $20M | Confirms significant cascade, not noise |
| OI drop | ≥ 1.5% | Confirms real positions wiped, not spoofed |
| Price momentum | ≥ 0.3% | Confirms price moving in cascade direction |
| RSI | 25–75 | Avoids chasing exhausted or extreme moves |

---

## Trade Direction Logic

The cascade direction determines the trade side:

- **Longs liquidated** → forced selling → price drops → enter **SELL**
- **Shorts liquidated** → forced buying → price pumps → enter **BUY**

The engine rides the continuation of the forced move, not a reversal.

---

## Risk Management

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Position size | 15% of capital | $15 per trade at $100 capital |
| Stop loss | 0.8% | Tight — cascades are fast and decisive |
| Take profit | 1.6% | 2:1 reward/risk ratio |
| Trailing stop | 0.5% | Locks in profit once move extends |
| Max trade duration | 30 minutes | Cascade moves exhaust quickly |
| Daily circuit breaker | -3% | Halts engine if daily loss exceeds 3% |

---

## Data Sources

| Source | Data | Endpoint |
|--------|------|----------|
| Binance Futures | Liquidation orders | `/fapi/v1/allForceOrders` |
| Binance Futures | Open interest | `/fapi/v1/openInterest` |
| Binance Futures | OI history | `/futures/data/openInterestHist` |
| Kraken | OHLCV (5min candles) | `/0/public/OHLC` |

All data sources are public and require no API key.

---

## Performance Expectations

T.E LCE is a high-frequency, low-capital engine. Individual trades are
small. The edge comes from consistency across many trades, not from
individual winners.

Expected characteristics:
- 3-8 trade opportunities per day in active markets
- 0 opportunities during low-volatility, low-leverage periods
- Win rate target: 55-65% (2:1 R:R means profitability above 34%)
- Average trade duration: 5-20 minutes

The engine will be DORMANT for extended periods during calm markets.
This is correct behaviour — it is waiting for its specific edge.

---

## Relationship to Other Engines

T.E LCE operates independently of all other engines. It does not read
S.E states or modify its behaviour based on macro conditions. It hunts
liquidation cascades regardless of market environment.

However, O.E Sentinel monitors LCE alongside all other engines and will
flag anomalies if unusual behaviour is detected.

---

*Giblets Creations · Internal Documentation · Not for distribution*
*"I wanted it. So I forged it. Now forge yours."*

---

## Implementation Notes (v2.3.8)

**Fee & Slippage Model**
Entry price is adjusted for trading costs before position sizing:
- BUY: entry price increased by feeRate + slippageRate
- SELL: entry price decreased by feeRate + slippageRate
- Default fee: 0.16% (Kraken maker), slippage: 0.1%

**Confidence Scoring**
Cascade confirmation now uses a graduated confidence score (0-1) rather than a hard boolean. A minimum score of 0.6 is required to trigger entry. Scoring breakdown:
- Liquidation volume (15min): full score ≥$20M, partial ≥$10M
- OI drop: full score ≥1.5%, partial ≥0.75%
- Price momentum: full score ≥0.3%
- RSI position: full score 35-65, partial 25-75

**Strategy Extraction**
`LCEDataFeed` and `LCEStrategy` classes live in `src/lce-strategy.js`.
`CCELCEEngine` (the platform wrapper) lives in `src/cce-lce-engine.js`.
