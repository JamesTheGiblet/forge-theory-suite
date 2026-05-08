# T.E Scalp
### High Frequency RSI + Volume Scalper — BTC/USDC on Kraken

**Status:** 🟢 Running | **Mode:** DRY RUN | **Tier:** Starter
**File:** `engines/te-scalp/`
**Code:** TE-SCP

---

## Overview

T.E Scalp is the highest frequency engine on the platform. It runs every 5 minutes, watches for RSI oversold conditions combined with volume spikes, and takes small quick positions in BTC/USDC. Target of 10-20 trades per week in any market condition. Small gains per trade compound quickly at scale.

---

## Strategy
RSI drops toward oversold (≤ 32)
+ Volume spike (1.5x average)
↓
STALK the setup
↓
RSI hits oversold OR bullish divergence confirmed
↓
BUY BTC/USDC — small position
↓
EXIT when:
Price recovers +0.8% (TARGET)
Price drops -0.5% (STOP LOSS)
RSI hits overbought ≥ 68 (RSI_OB)
6 candles held / 30 min (TIMEOUT)
↓
Cooldown 3 candles (15 min) before next trade
---

## States
IDLE     → STALKING  (RSI approaching oversold + cooldown done)
STALKING → ENTRY     (RSI oversold + volume spike OR bullish divergence)
ENTRY    → RIDING    (position opened)
RIDING   → EXIT      (target / stop / RSI overbought / timeout)
EXIT     → IDLE      (position closed, cooldown starts)
No DORMANT state — always IDLE or active.

---

## Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Capital | $100 USDC | Starting allocation |
| RSI Period | 14 | Standard RSI calculation |
| RSI Oversold | ≤ 32 | Entry threshold |
| RSI Overbought | ≥ 68 | Exit on momentum exhaustion |
| Volume Spike | 1.5x | Volume must be 1.5x 12-candle average |
| Target | +0.8% | Take profit |
| Stop Loss | -0.5% | Maximum loss per trade |
| Max Hold | 6 candles | Force exit after 30 minutes |
| Cooldown | 3 candles | 15 min wait after each trade |
| Max Daily Loss | 3% | Circuit breaker |

---

## Signal Logic

**RSI (14):**
Calculated from rolling close prices. Oversold = buyers potentially stepping in. Combined with volume spike = high probability reversal setup.

**Volume Spike:**
Compares current candle volume to 12-candle rolling average. 1.5x+ average volume on an oversold candle confirms genuine buying pressure.

**Bullish Divergence:**
Price making lower lows while RSI makes higher lows. Classic reversal signal — momentum is shifting even as price continues lower.

**Exit Signals:**
- TARGET: Price recovered +0.8% from entry
- STOP: Price dropped -0.5% from entry
- RSI_OB: RSI hit 68+ — momentum exhausted, take whatever profit exists
- TIMEOUT: 30 minutes held without hitting target or stop

---

## Expected Behaviour

| Market | Expected Activity |
|--------|------------------|
| High volatility | 3-5 trades/day — lots of RSI extremes |
| Low volatility | 1-2 trades/day — fewer oversold setups |
| Bear trending | More stop losses — price keeps falling after entry |
| Bull trending | Fast target hits — momentum recovers quickly |
| Ranging | Best conditions — oversold/overbought cycles frequently |

---

## Data Sources

- BTC/USDC price — Kraken public ticker (5min polling)
- Volume — Kraken ticker (today's volume)
- RSI — calculated internally from price history
- No external APIs required

---

## Integration

| System | Status |
|--------|--------|
| Engine Registry | ✅ Auto-loaded |
| O.E Observer | ✅ State captured every 15 min |
| O.E Sentinel | ✅ 17 engines monitored |
| F.L Forensic | ✅ scalp_trades table analysed Monday |
| G.O Orchestrator | ✅ Scored and ceiling adjusted |
| CSS Siphon | ✅ scalp_trades wired |
| Dashboard | ✅ T.E tab, Starter tier, Kraken badge |
| Telegram | ✅ Trade notifications |

---

## Logging

Scalp logs every 12 cycles (1 hour) to avoid spam when IDLE. When STALKING, RIDING or EXIT — logs every cycle for full visibility.

Trade log format:
[TE-SCP] W | 66732→67267 | +0.80% | TARGET | WR: 67% (12 trades)
[TE-SCP] L | 66800→66467 | -0.50% | STOP | WR: 63% (13 trades)
---

## Risk Notes

At $100 capital and 0.8% target:
- Win = +$0.80 per trade
- Loss = -$0.50 per trade
- Break-even win rate = 38% (very achievable)
- At 60% win rate and 15 trades/week = ~$4.50/week = ~$18/month per $100

Scales linearly with capital. At $1,000 = ~$180/month at 60% win rate.

The tight stop loss (-0.5%) means losses are small and frequent wins outpace them.

---

## Going Live Checklist

- [ ] Minimum 200 dry run cycles (1 week)
- [ ] Minimum 20 complete trades in dry run
- [ ] Win rate > 55% sustained over 20+ trades
- [ ] F.L Forensic has analysed patterns
- [ ] Max daily loss < 2% in dry run
- [ ] Kraken account has sufficient USDC

---

*Giblets Creations · v1.0 · March 2026*
*"I wanted it. So I forged it. Now forge yours."*
