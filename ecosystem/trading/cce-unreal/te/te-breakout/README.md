# T.E Breakout
### Volatility Squeeze Breakout Engine — Multi-Pair 1H Trading

**Classification:** Internal · Proprietary
**Asset Class:** Cryptocurrency (BTC, ETH, SOL)
**Exchange:** Kraken
**Cycle:** 1 hour
**Capital:** $100 USDC
**Status:** 🔵 Dry Run

---

## What Is T.E Breakout?

T.E Breakout is the third Tactical Engine in the T.E Ecosystem. It
detects periods of price compression — known as Bollinger Band squeezes
— and enters positions when that compression violently releases into a
directional breakout.

Markets alternate between two states: ranging (compressed, low
volatility) and trending (expanding, high volatility). A squeeze is
the coiled spring before the explosive move. T.E Breakout identifies
the coil and positions itself for the release.

---

## Why Volatility Squeezes Work

Bollinger Bands expand and contract with market volatility. When the
bands compress to their narrowest point, the market is in equilibrium —
buyers and sellers are balanced. This balance cannot last. One side will
eventually overwhelm the other, and when it does, the release is fast
and decisive.

The edge is not in predicting direction — it is in being positioned
and ready when the release occurs, with confirmation that the move is
real before committing capital.

---

## What It Pays Attention To

**Bollinger Bands (20-period, 2 std dev)**
- Band width relative to recent average
- A squeeze is detected when band width falls below 2%
- Minimum 6 consecutive squeeze bars required before watching

**Volume Confirmation**
- Entry volume must be 1.8x the 20-period average
- Eliminates false breakouts on thin volume

**RSI (14-period)**
- Direction filter — RSI above 50 favours long, below 50 favours short
- Prevents entering against momentum

**ATR (14-period)**
- Stop loss: 1.5x ATR from entry
- Take profit: 2.5x ATR from entry
- Adapts to current volatility conditions

---

## The Five States

```
DORMANT    No squeeze detected across any watched pair.

SCANNING   One or more pairs showing active squeeze (band width < 2%
           for 6+ consecutive bars). Monitoring for breakout trigger.

TRIGGERED  Breakout confirmed — volume spike + directional close
           outside the bands. Position entry decision made.

RIDING     Position open. ATR-based stop and target active.
           Maximum 6 hours in any trade.

EXITING    Position closed. Brief cooldown before resuming scan.
```

---

## Entry Conditions

| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| Band width | < 2% | Confirms compression |
| Squeeze duration | ≥ 6 bars | Avoids premature entries |
| Breakout volume | ≥ 1.8x average | Confirms conviction |
| Candle close | Outside bands | Confirms directional break |

---

## Risk Management

| Parameter | Value |
|-----------|-------|
| Position size | 2% risk per trade |
| Stop loss | 1.5x ATR |
| Take profit | 2.5x ATR |
| Max concurrent positions | 2 |
| Max trade duration | 6 hours |
| Daily circuit breaker | -3% |
| Exchange fee rate | 0.16% (Kraken maker) |

---

## Pairs Monitored

BTC/USDC · ETH/USDC · SOL/USDC

Each pair is evaluated independently. Multiple simultaneous squeezes
are possible — the engine can hold up to 2 positions concurrently.

---

*Giblets Creations · Internal Documentation · Not for distribution*
*"I wanted it. So I forged it. Now forge yours."*

---

## Implementation Notes (v2.3.7)

**Squeeze Detection Fix**
detectSqueeze() loop corrected — previously iterated squeezeBars+1 times (off by one), which could include a non-squeeze bar and incorrectly pass the allNarrow check. Now iterates exactly squeezeBars times.

**Fee-Aware Position Sizing**
calcPositionSize() now accounts for trading fees in cost calculation. Position size is reduced to ensure total cost (trade + fees) does not exceed available capital.
