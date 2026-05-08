# Trading Strategy — XRP Sentiment Fade

## The Thesis

XRP is one of the most sentiment-driven assets in crypto. When Fear & Greed hits extreme fear, XRP gets obliterated — often dropping 40-60% from recent highs. When sentiment recovers, XRP pumps harder and faster than BTC.

Same signal as Fear Fade. Bigger multiplier.

## Entry Conditions (ALL 5 must be met)

| Condition | Threshold | Why |
|-----------|-----------|-----|
| Fear & Greed | ≤ 20 | Extreme Fear — sentiment capitulation |
| XRP drop from 30d high | ≥ 25% | Price capitulation confirmed |
| XRP RSI | ≤ 35 | Oversold on daily timeframe |
| BTC dominance | ≥ 54% | Capital hiding in BTC (alts suppressed) |
| Volume spike | ≥ 1.5x | Panic selling exhaustion |

All five together = historically rare. When they align it's the bottom of the fear cycle.

## Exit Conditions (First to trigger)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Fear & Greed | ≥ 60 | Sell — greed returns |
| Take profit | ≥ 40% | Sell — profit target hit |
| Stop loss | ≤ -20% | Sell — protect capital |
| Max hold | 90 days | Sell — force exit |

No greed. When target is hit or sentiment recovers, it exits. Doesn't try to catch the top.

## Position Sizing

- **Entry**: Full capital deployed at once (not scaled)
- **Exit**: Full position sold at once
- **No partials** — keep it simple

## Egypt Fund

15% of each profit goes to Egypt fund. Remaining 85% compounds.

### Example Cycles

| Cycle | Start | Profit | Egypt (15%) | Compounding (85%) | New Capital |
|-------|-------|--------|-------------|-------------------|-------------|
| 1 | $250 | +40% ($100) | $15 | $85 | $335 |
| 2 | $335 | +40% ($134) | $20 | $114 | $449 |
| 3 | $449 | +40% ($180) | $27 | $153 | $602 |
| 4 | $602 | +40% ($241) | $36 | $205 | $807 |
| 5 | $807 | +40% ($323) | $48 | $275 | $1082 |

**After 5 cycles:** Egypt fund ~$146, Capital ~$1082

## Risk Management

| Protection | Value |
|------------|-------|
| Stop loss per cycle | -20% |
| Circuit breaker | -40% total drawdown |
| Max hold time | 90 days |
| No leverage | Spot only |
| Dry run default | Safe by default |

## Why XRP Specifically

| Factor | Why |
|--------|-----|
| Volatility | 50-100% swings in sentiment cycles |
| Liquidity | Top 10 on Kraken — tight spreads |
| Sentiment | Extremely retail-driven |
| History | Bottomed at F&G < 15 in every major cycle |
| Recovery | 60-200% when sentiment normalised |

## State Machine Flow

```

DORMANT
│
▼ (F&G ≤ 25)
WATCHING
│
▼ (All 5 entry conditions met)
LOADED (BUY)
│
▼
HOLDING
│
▼ (Exit condition triggered)
EXITING (SELL)
│
▼ (Profit calculated)
DORMANT

```

## Success Metrics

| Target | Value |
|--------|-------|
| Egypt fund | $1000 (~£800) |
| Cycles needed | 3-5 full sentiment cycles |
| Timeframe | By 4th March 2027 (331 days) |
