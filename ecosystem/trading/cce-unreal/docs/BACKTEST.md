# Cascade Compounding Engine (CCE)

## Backtest System

Validate the Cascade Compounding Engine strategy by replaying historical data through the production state machine.

---

## Quick Start

### 1. Fetch Historical Data

```bash
# Fetch BTC/USD daily OHLCV from Kraken
node scripts/fetch-historical-data.js kraken 2013-01-01 2026-12-31 ./data/btc_historical.csv

# Fetch real Fear & Greed index history
node scripts/fetch-historical-data.js fng 2013-01-01 2026-12-31

# Fetch BTC dominance history
node scripts/fetch-historical-data.js dominance 2013-01-01 2026-12-31

# Fetch altcoin price history (ETH, SOL, RNDR, FET)
node scripts/fetch-alt.js
```

### 2. Merge Data Sources

```bash
# Merge BTC OHLCV with F&G, dominance, and altcoin prices
node scripts/merge-data.js \
  ./data/btc_historical.csv \
  ./data/fng_historical.csv \
  ./data/dominance_historical.csv \
  ./data/eth_historical.csv \
  ./data/sol_historical.csv \
  ./data/rndr_historical.csv \
  ./data/fet_historical.csv
# Output: ./data/btc_historical_merged.csv
```

### 3. Run Backtest

```bash
# Run full backtest with merged data (recommended)
node tests/backtest.js ./data/btc_historical_merged.csv

# Results printed to console and exported to ./backtest-results/
```

### 4. Visualise Results

```bash
# Generate interactive equity curve HTML
node scripts/visualize.js ./backtest-results/daily_snapshots.csv ./backtest-results/equity_curve.html
```

---

## Output Files

The backtest generates 4 files in `./backtest-results/`:

**daily_snapshots.csv** — Portfolio value every day

```
date,portfolio_value,btc_price,state,btc_holdings,usd_holdings
2013-01-01,300.00,13.51,DORMANT,0.00,300.00
2013-01-15,312.45,14.20,ACCUMULATION,5.26,237.18
```

**trades.csv** — Every buy/sell executed

```
date,side,symbol,amount,price,value
2013-01-15,buy,BTC,5.26,14.20,74.69
2013-03-22,sell,BTC,2.63,52.40,137.81
```

**state_history.csv** — State transitions

```
date,from_state,to_state,reason
2013-01-15,DORMANT,ACCUMULATION,Forward progression
2013-02-10,ACCUMULATION,IGNITION,Forward progression
```

**summary.json** — Complete performance metrics

```json
{
  "config": {
    "startingCapital": 300,
    "startDate": "2013-01-01",
    "endDate": "2026-12-31"
  },
  "results": {
    "finalValue": 80840.97,
    "totalReturn": 26846.99,
    "btcHoldReturn": 14751.15,
    "alphaVsBTC": 12095.84,
    "maxDrawdown": 0.5044,
    "sharpeRatio": 1.18,
    "sortinoRatio": 1.86,
    "winRate": 48.7,
    "timeInMarket": 62.1
  }
}
```

---

## Understanding the Results

### Performance Metrics

Total Return: +26,847% means $300 → $80,841
Alpha: +12,096% means CCE beat BTC hold by 12,096 percentage points
Max Drawdown: 50.44% means at some point the portfolio was down 50.44% from its peak
Sharpe: CCE baseline: ~1.18
Sortino: CCE baseline: ~1.86
Win Rate: CCE baseline: ~48.7%
Time in Market: CCE baseline: ~62.1%

## Validation Checklist

### 1. State Machine Logic

```bash
cat backtest-results/state_history.csv
```

Look for:

- ✅ DORMANT during bear markets (2014, 2018, 2022)
- ✅ IGNITION during confirmed uptrends (2017, 2020-2021)
- ✅ CASCADE_1 during large-cap rotation phases
- ✅ EXTRACTION during major crashes (COVID March 2020, FTX Nov 2022)
- ❌ Rapid ping-ponging between states (oversensitive signals)
- ❌ Stuck in one state for years (broken transitions)

### 2. Trade Execution

```bash
wc -l backtest-results/trades.csv
```

Expected: 300-500 trades over 13 years (~35-40 per year)

Red flags:

- Thousands of trades = churning, hysteresis not working
- Zero trades = state machine never left DORMANT

### 3. Compare to Known Market Events

| Date | Event | Expected State |
|------|-------|----------------|
| 2014-11-15 | Bear market bottom ($350) | DORMANT |
| 2017-12-17 | Bull market top ($19,783) | SPILLWAY or EXTRACTION |
| 2018-12-15 | Capitulation ($3,200) | DORMANT |
| 2020-03-13 | COVID crash ($4,970) | EXTRACTION → DORMANT |
| 2021-11-10 | Bull market top ($68,789) | SPILLWAY or EXTRACTION |
| 2022-11-09 | FTX collapse ($16,000) | DORMANT |
| 2024-03-14 | BTC ATH ($73,750) | CASCADE_1 or CASCADE_2 |

### 4. Compare to Validated Results

Current production baseline (2013-2026, $300 starting capital):

```
Total Return:     +26,847%
Alpha vs BTC:     +12,096%
Max Drawdown:     50.44%
Sharpe Ratio:     1.18
Sortino Ratio:    1.86
Win Rate:         48.7%
Time in Market:   62.1%
Trades Executed:  398
```

Your replication should be within ±5% if using the same merged dataset, same date range, and unmodified production strategy.js. Larger deviation indicates a data or code difference.

---

## Limitations & Assumptions

### What the Backtest Does

✅ Replays actual BTC price history
✅ Uses production state machine logic (identical code path to live engine)
✅ Calculates all technical signals (SMA, BB Width, velocity ROC) from real prices
✅ Uses real Fear & Greed index data when present in merged CSV
✅ Uses real BTC dominance data when present in merged CSV
✅ Uses real altcoin prices (ETH, SOL, RNDR, FET) when present in merged CSV
✅ Applies 4% APY risk-free rate yield to idle cash (daily compounding)
✅ Assets with price 0 automatically treated as zombies (pre-existence handling)
✅ Tracks portfolio rebalancing trades and measures vs buy-and-hold

### What the Backtest Approximates

⚠️ **Fear & Greed Index** — Real data available from `fng` source back to ~2018. Before 2018 the backtest derives F&G from volatility + trend proxy. Earlier periods are less accurate.

⚠️ **BTC Dominance** — Real data available from `dominance` source. If missing for a given date, falls back to trend-based proxy (50 ± 5% heuristic). Proxy doesn't capture dominance cycles accurately — CASCADE_1 transitions may fire differently.

⚠️ **Altcoin Prices** — Real data available for ETH (2015+), SOL (2020+), RNDR (2021+), FET (2019+) via `fetch-alt.js`. Assets with no price data for a given date are treated as zombies and skipped — this correctly models pre-existence but means CASCADE states have no alt allocation in early years.

⚠️ **ETF Flow Proxy** — 7-day BTC price delta used as directional proxy for institutional flows. Real magnitude differs from proxy. Severe failure threshold (-$500M) calibrated to ~$5k 7-day price drop.

⚠️ **No Trading Fees** — Kraken charges ~0.16% maker / 0.26% taker. At 398 trades with typical values, fees are modest relative to +26,847% scale but will affect live performance.

⚠️ **Perfect Execution** — Trades fill at exact daily close price. Live execution has slippage, particularly on alt positions with thinner order books.

⚠️ **Unimplemented Signals** — Four signals are hardcoded stubs in production and backtest: `btc_5_percent_drop`, `multiplier_rsi_above_85`, `btc_d_rising_sharply` (approximated in backtest), `alt_season_index_above_75`. When implemented, results may shift.

### Expected Live vs Backtest Divergence

Expect live performance to be 10-20% worse due to fees, slippage, and real signal variance. The backtest is intentionally optimistic — this is the ceiling, not the guarantee.

---

## Interpreting Results

### Scenario 1: Results Match Validated Performance (±10%)

```
Total Return:     +24,000-30,000% ✅
Alpha vs BTC:     +10,000-14,000% ✅
Max Drawdown:     45-56% ✅
Sharpe Ratio:     1.0-1.4 ✅
Sortino Ratio:    1.5-2.0 ✅
```

**Interpretation:** Strategy logic is correctly implemented. State machine is working as designed.

**Next steps:**

1. Review `state_history.csv` — verify transitions align with major market events
2. Run parameter optimisation: `node tests/strategy-tester.js`
3. Complete dry run validation (66+ cycles)
4. Proceed to live trading with £300 risk capital

---

### Scenario 2: Significantly Underperforms

```
Total Return:     +150% ❌
Alpha vs BTC:     negative ❌
```

**Possible causes:**

- State machine never leaves DORMANT (check `state_history.csv`)
- F&G proxy always below 40 (permanent DORMANT lock)
- Signals inverted
- Transition thresholds misconfigured

**Next steps:**

1. Enable verbose mode in backtest.js and inspect signal values per day
2. Verify `strategy.js` transition logic matches this document's spec
3. Check F&G mock output — if consistently < 40, DORMANT exit is blocked

---

### Scenario 3: Massively Overperforms

```
Total Return:     +80,000% ❌ (too good)
Max Drawdown:     -3% ❌ (impossible)
```

**Possible causes:**

- Lookahead bias — SMA or signals calculated with future prices
- Mock signals too perfect
- Altcoin ratio assumptions assuming perfect correlation

**Next steps:**

1. Verify signal calculations use only data available at time `t`
2. Test with randomised F&G/dominance — if results hold, strategy may be overfit
3. Do not go live until this is resolved

---

### Scenario 4: High Returns, Excessive Drawdown

```
Total Return:     +35,000% ✅
Max Drawdown:     -85% ❌
```

**Causes:**

- Trailing stop too loose
- IGNITION holding through crashes
- Severe failure threshold not triggering early enough

**Fixes:**

1. Tighten `ignitionTrailingStopPct` (currently 0.021, try 0.03-0.05)
2. Lower severe failure F&G threshold (currently 20, try 25)
3. Run `node tests/strategy-tester.js` to find optimal parameters

---

## Debugging Failed Backtests

### Enable Verbose Mode

```javascript
const backtester = new Backtester({
  startingCapital: 300,
  verbose: true,
  checkIntervalDays: 1
});
```

Output:

```
2013-01-15 | DORMANT → ACCUMULATION | BTC: $14 | F&G: 45
2013-02-10 | ACCUMULATION → IGNITION | BTC: $24 | F&G: 58
```

### Inspect Specific Days

```javascript
if (day.date === '2017-12-17') {
  console.log('Context:', JSON.stringify(context, null, 2));
  console.log('Signals:', JSON.stringify(signals, null, 2));
  console.log('State:', this.stateMachine.currentState);
}
```

### Verify Database

```bash
node scripts/verify-data.js
```

Shows record counts, last 10 cycle rows, recent state history and trades directly from the SQLite database.

---

## Production vs Backtest Differences

| Aspect | Backtest | Production |
|--------|----------|-----------|
| **BTC price data** | Historical CSV (Kraken OHLCV) | Live Kraken API (CCXT) |
| **Fear & Greed** | Real data (2018+), proxy before | Real API (alternative.me, 5s timeout) |
| **BTC Dominance** | Real data when available, proxy fallback | LunarCrush v4 → CoinGecko → CoinPaprika → proxy → 55% |
| **Altcoin prices** | Real prices when available, 0 (zombie) when not | Live tickers (ETH/USD, SOL/USD, RENDER/USD, FET/USD) |
| **Execution** | Instant fills at daily close | Market orders (slippage applies) |
| **Fees** | Zero | ~0.16-0.26% per trade |
| **Update frequency** | Daily | Every 4 hours |
| **Zombie scanner** | Assets with price 0 skipped | Live zero/null/NaN price detection |
| **Signal stubs** | 4 signals approximated or hardcoded | Same 4 signals hardcoded (TODO) |

---

## Parameter Optimisation

The strategy tester runs grid search + random exploration across key parameters:

```bash
node tests/strategy-tester.js
```

Scoring: 50% Sharpe ratio + 30% log-scaled return + 20% drawdown penalty. Configs with drawdown > 70% are disqualified. Results deduplicated across runs — previously tested configs are skipped automatically.

Results saved to `./optimization-results/optimization_report_<timestamp>.json`.

Current production values represent the best validated parameter set from optimisation runs.

---

## Advanced: Out-of-Sample Validation

For stronger confidence, test on sub-periods:

```bash
# Bull market only (2020-2021)
node tests/backtest.js ./data/btc_historical_merged.csv --startDate 2020-01-01 --endDate 2021-12-31

# Bear market only (2022)
node tests/backtest.js ./data/btc_historical_merged.csv --startDate 2022-01-01 --endDate 2022-12-31

# Post-ETF era (2024+)
node tests/backtest.js ./data/btc_historical_merged.csv --startDate 2024-01-01 --endDate 2026-12-31
```

If the strategy holds positive alpha across all sub-periods, the edge is likely real. If it only works on specific years, it may be overfit to historical conditions.

---

## Next Steps After Validation

✅ **If backtest matches validated results:**

1. Dry run active — monitor 66+ cycles
2. Verify live signals match backtest at same BTC prices
3. Go live March 1, 2026 with £300 risk capital
4. 90-day assessment period before any scaling

❌ **If backtest fails:**

1. Debug state machine with verbose mode
2. Verify data pipeline with `verify-data.js`
3. Fix broken transitions and re-run
4. Do not go live until results match theory

---

**Ready to validate?**

```bash
node scripts/fetch-historical-data.js kraken 2013-01-01 2026-12-31
node scripts/fetch-historical-data.js fng 2013-01-01 2026-12-31
node scripts/fetch-historical-data.js dominance 2013-01-01 2026-12-31
node scripts/fetch-alt.js
node scripts/merge-data.js ./data/btc_historical.csv ./data/fng_historical.csv ./data/dominance_historical.csv ./data/eth_historical.csv ./data/sol_historical.csv ./data/rndr_historical.csv ./data/fet_historical.csv
node tests/backtest.js ./data/btc_historical_merged.csv
node scripts/visualize.js ./backtest-results/daily_snapshots.csv
```
