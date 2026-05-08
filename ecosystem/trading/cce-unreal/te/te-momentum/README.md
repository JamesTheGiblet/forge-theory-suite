# T.E Momentum
### Momentum Tactical Engine — Multi-Pair 2H Trading

**Classification:** Internal · Proprietary  
**Asset Class:** Cryptocurrency (BTC, ETH, SOL)  
**Exchange:** Kraken  
**Cycle:** 2 hours  
**Capital:** Dedicated allocation (separate from S.E Crypto and T.E Grid)  
**Status:** 🔵 Dry Run — Active (firing live entries)

---

## What Is T.E Momentum?

T.E Momentum is the second Tactical Engine in the T.E Ecosystem. Where
T.E Grid harvests oscillation mechanically, T.E Momentum captures
directional moves. It monitors BTC, ETH and SOL on 2-hour candles
and enters positions when momentum conditions align across multiple
independent signals.

It does not predict direction. It waits for direction to establish
itself — confirmed by price structure, momentum indicators, and
volume participation — then enters in the direction of the confirmed
move.

---

## What It Pays Attention To

**Price Structure**
- EMA crossover (fast over slow) as the primary trigger
- Price position relative to the trend EMA as a directional filter
- Only trades in the direction of the dominant trend

**Momentum**
- RSI to confirm momentum is present and building
- Requires RSI above a defined threshold and rising
- Avoids entries when momentum is fading or diverging

**Volume**
- Current volume versus 20-period average
- Requires meaningful volume expansion at entry
- Filters out low-conviction moves driven by thin participation

**Volatility**
- ATR (Average True Range) for dynamic stop and target placement
- Stops placed at 2x ATR below entry — adapts to market conditions
- Targets placed at 3x ATR above entry — minimum 1.5:1 reward/risk
- Fee guard: ATR must exceed fees by 3x to make trade worthwhile

---

## Behaviour

T.E Momentum runs every 2 hours, aligned with the 2H candle close.
On each cycle it evaluates all three pairs independently. For each pair:

1. Checks if an existing position needs managing
2. Checks cooldown (after a loss, waits before re-entering)
3. Checks if maximum concurrent positions are held
4. Checks daily loss circuit breaker
5. Evaluates entry conditions

**Entry** requires all conditions to align simultaneously — EMA cross,
trend alignment, RSI confirmation, volume expansion, and ATR fee guard.
A single missing condition cancels the entry.

**Exit** is managed dynamically:
- Stop loss at 2x ATR — always active
- Take profit at 3x ATR — locks in gains
- Trail activation at 1.5x ATR — moves stop to entry for free ride
- Time exit — if no progress after 3 candles, exit flat

**Risk management:**
- Maximum 2 concurrent positions across all pairs
- 2% of capital risked per trade
- 3% daily loss circuit breaker — no new entries after limit hit
- 2-candle cooldown after a losing trade

---

## Philosophy

T.E Momentum is built on a single insight: momentum has continuation
bias. When a move is confirmed by price structure, momentum indicators,
and volume simultaneously, it is more likely to continue than to reverse
immediately. The engine enters when that confluence is present and exits
before the momentum fades.

It does not need to be right every time. It needs to be right often
enough, with a reward/risk ratio that makes the wins larger than the
losses. The 3:1 ATR target versus 2:1 ATR stop creates an asymmetric
profile — even a 40% win rate produces positive expectancy.

The complementary relationship with T.E Grid is deliberate. When markets
trend, T.E Momentum is active and T.E Grid cycles less. When markets
range, T.E Grid cycles frequently and T.E Momentum finds fewer setups.
Together they provide more consistent combined activity across different
market conditions.

---

## Capital

T.E Momentum operates on a dedicated $125 USDC allocation. This capital
is drawn from the S.E Crypto allocation while S.E Crypto is in DORMANT
state — the capital is idle there and works harder here.

When S.E Crypto advances to ACCUMULATION, the capital allocation plan
will be reviewed. The G.O Orchestrator will eventually manage this
reallocation automatically.

---

## Activation Sequence

1. Engine is wired and present — `mom.enabled: false` in config
2. Set `mom.enabled: true`, `mom.dryRun: true`
3. Run dry for 10+ signal cycles to validate signal quality
4. Review dry run trade log — check win rate and signal frequency
5. Set `mom.dryRun: false` for live execution

---

*Giblets Creations · Internal Documentation · Not for distribution*

---

## Implementation Notes (v2.3.5)

**Trailing Stop Fix**
checkExit() now evaluates trailing stop BEFORE stop loss and take profit. Previously the order was reversed — trailing stop could never activate if stop loss fired first. Trail condition corrected: fires when price reaches trailLevel AND stop has not yet been moved up.

**Fee-Aware Position Sizing**
calcPositionSize() now accounts for trading fees. Total cost (trade + fees) is checked against available capital before returning position size.
