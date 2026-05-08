// tests/backtest.js
// Replay historical data through the production CCE state machine
// Validates strategy logic and measures performance vs buy-and-hold

'use strict';

const fs   = require('fs');
const path = require('path');
const {
  CCEStateMachine,
  CCERebalancer,
  TechnicalSignals
} = require('../src/strategy');
const productionConfig = require('../config');

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '..', 'backtest-results');

class Backtester {
  constructor(config = {}) {
    // Note: ...config spread comes LAST so caller values override defaults
    this.config = {
      startingCapital:         300,
      startDate:               '2013-01-01',
      endDate:                 '2024-12-31',
      checkIntervalDays:       1,
      verbose:                 true,
      riskFreeRate:            0.04,
      minDormantDays:          30,
      ignitionTrailingStopPct: 0.021,
      minHoldDays:             undefined,
      ...config
    };

    this.stateMachine = new CCEStateMachine({
      minDormantDays:          this.config.minDormantDays,
      ignitionTrailingStopPct: this.config.ignitionTrailingStopPct,
      minHoldDays:             this.config.minHoldDays
    });

    // minTradeValue: 0 ensures DORMANT = truly 100% cash (no dust accumulation)
    this.rebalancer = new CCERebalancer({ trading: { minTradeValue: 0 } });
    this.rebalancer = new CCERebalancer({
      trading: { minTradeValue: 0 },
      strategy: productionConfig.strategy
    });
    this.signals    = new TechnicalSignals();

    this.results = {
      trades:         [],
      dailySnapshots: [],
      stateHistory:   [],
      finalValue:     0,
      totalReturn:    0,
      maxDrawdown:    0,
      sharpeRatio:    0,
      sortinoRatio:   0,
      winRate:        0,
      timeInMarket:   0,
      alphaVsBTC:     0,
      btcHoldReturn:  0
    };

    this.portfolio = {
      USD:  this.config.startingCapital,
      BTC:  0,
      ETH:  0,
      SOL:  0,
      RNDR: 0,
      FET:  0
    };

    this.cycleCount  = 0;
    this.peakValue   = this.config.startingCapital;
    this.currentDate = null;
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Load historical OHLCV + supplementary data from CSV.
   * Expected format: date,open,high,low,close,volume
   * Optional columns: fear_greed, btc_dominance, eth_close, sol_close, rndr_close, fet_close
   */
  loadHistoricalData(csvPath) {
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Historical data file not found: ${csvPath}`);
    }

    const csv     = fs.readFileSync(csvPath, 'utf8');
    const lines   = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row    = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx]?.trim();
      });

      const parsed = {
        date:          row.date,
        open:          parseFloat(row.open),
        high:          parseFloat(row.high),
        low:           parseFloat(row.low),
        close:         parseFloat(row.close),
        volume:        parseFloat(row.volume),
        fear_greed:    row.fear_greed    ? parseFloat(row.fear_greed)    : null,
        btc_dominance: row.btc_dominance ? parseFloat(row.btc_dominance) : null,
        eth_close:     row.eth_close     ? parseFloat(row.eth_close)     : null,
        sol_close:     row.sol_close     ? parseFloat(row.sol_close)     : null,
        rndr_close:    row.rndr_close    ? parseFloat(row.rndr_close)    : null,
        fet_close:     row.fet_close     ? parseFloat(row.fet_close)     : null
      };

      // Skip rows with invalid OHLCV data
      if (isNaN(parsed.close) || !parsed.date) continue;

      data.push(parsed);
    }

    const filtered = data.filter(d => d.date >= this.config.startDate && d.date <= this.config.endDate);
    console.log(`✅ Loaded ${filtered.length} days (${data.length} total rows, filtered to date range)`);
    return filtered;
  }

  // ============================================================================
  // SIGNAL CALCULATION
  // ============================================================================

  /**
   * Calculate all signals for a given day.
   * Note: velocity signals are computed inside TechnicalSignals.getAllSignals() —
   * backtest overrides only the signals that require backtest-specific approximations.
   */
  calculateSignals(currentPrice, historicalPrices, fearGreed, btcDominance) {
    const signals = this.signals.getAllSignals(currentPrice, btcDominance, historicalPrices);

    // Override: btc_d_rising_sharply — production uses multi-day dominance history
    // Backtest approximation: high dominance during uptrend
    signals.btc_d_rising_sharply = btcDominance > 65 && signals.sma_20_above_50;

    // Override: multiplier signals — require per-asset RSI, not available in OHLCV
    // Approximation: proxy off BTC momentum (conservative — likely understates exits)
    const recentGain = historicalPrices.length >= 5
      ? (currentPrice - historicalPrices[historicalPrices.length - 5]) /
        historicalPrices[historicalPrices.length - 5]
      : 0;
    signals.multiplier_underperforming_48h = recentGain < -0.08;
    signals.multiplier_rsi_above_85        = false; // Requires proper RSI — not yet implemented

    // Override: alt season index — approximated from greed + BTC consolidation
    signals.alt_season_index_above_75 = fearGreed > 75 && signals.btc_consolidating;

    // Note: velocity signals (velocity_underperforming_btc_72h, velocity_reversal,
    // velocity_asset_breaking_out) are NOT overridden — getAllSignals() already
    // computes them from the same 5-day ROC formula used in backtest

    return signals;
  }

  // ============================================================================
  // PORTFOLIO
  // ============================================================================

  calculatePortfolioValue(prices) {
    return (
      this.portfolio.USD  +
      this.portfolio.BTC  * (prices.BTC  || 0) +
      this.portfolio.ETH  * (prices.ETH  || 0) +
      this.portfolio.SOL  * (prices.SOL  || 0) +
      this.portfolio.RNDR * (prices.RNDR || 0) +
      this.portfolio.FET  * (prices.FET  || 0)
    );
  }

  executeRebalance(targetState, prices, zombies = []) {
    const { actions } = this.rebalancer.rebalanceForState(
      this.portfolio,
      targetState,
      prices,
      zombies
    );

    for (const action of actions) {
      const { symbol, action: side, price } = action;
      let { amount } = action;

      if (side === 'buy') {
        let cost = amount * price;

        // Floating point guard: allow up to 0.1% overshoot to prevent dust
        if (cost > this.portfolio.USD && cost <= this.portfolio.USD * 1.001) {
          amount = this.portfolio.USD / price;
          cost   = this.portfolio.USD;
        }

        if (this.portfolio.USD >= cost) {
          this.portfolio.USD          -= cost;
          this.portfolio[symbol]       = (this.portfolio[symbol] || 0) + amount;
          this.results.trades.push({ date: this.currentDate, side, symbol, amount, price, value: cost });
        }
      } else if (side === 'sell') {
        const held = this.portfolio[symbol] || 0;

        // Dust guard: if selling ≥ 99.9% of holding, sell entire position
        if (amount >= held * 0.999) amount = held;

        if (held >= amount && amount > 0) {
          this.portfolio[symbol] -= amount;
          if (this.portfolio[symbol] < 1e-8) this.portfolio[symbol] = 0;
          this.portfolio.USD += amount * price;
          this.results.trades.push({ date: this.currentDate, side, symbol, amount, price, value: amount * price });
        }
      }
    }
  }

  // ============================================================================
  // MAIN RUN
  // ============================================================================

  async run(historicalData) {
    if (!historicalData || historicalData.length === 0) {
      throw new Error('No historical data provided — check date range and CSV content.');
    }

    console.log('\n🚀 Starting Backtest...');
    console.log(`📅 Period: ${this.config.startDate} → ${this.config.endDate}`);
    console.log(`💰 Starting Capital: $${this.config.startingCapital}`);
    console.log('');

    const hasRealAltData = historicalData.some(d => d.eth_close !== null);
    if (hasRealAltData) {
      console.log('✅ Real altcoin price data detected — using actual prices.');
    } else if (this.config.verbose) {
      console.warn('⚠️  No altcoin price data found. Alt states (CASCADE_1/2) will not execute alt trades.');
    }

    // Initialise state machine time to start of simulation
    // Without this, stateEnteredAt defaults to now(), causing negative "days in state"
    this.stateMachine.stateEnteredAt = new Date(historicalData[0].date);

    const btcStartPrice = historicalData[0].close;
    let btcHoldValue    = this.config.startingCapital;

    for (let i = 0; i < historicalData.length; i += this.config.checkIntervalDays) {
      const day        = historicalData[i];
      this.currentDate = day.date;
      this.cycleCount++;

      // Apply risk-free rate yield on idle cash
      if (this.portfolio.USD > 0) {
        this.portfolio.USD += this.portfolio.USD * (this.config.riskFreeRate / 365);
      }

      // Build rolling price history window (up to 200 days)
      const windowStart     = Math.max(0, i - 199);
      const historicalPrices = historicalData.slice(windowStart, i + 1).map(d => d.close);

      // Fear & Greed: use real data if present, otherwise derive from trend + volatility
      // Note: volatility uses log returns, applied as linear penalty — intentional approximation
      let fearGreed;
      if (day.fear_greed !== null && !isNaN(day.fear_greed)) {
        fearGreed = day.fear_greed;
      } else {
        const vol   = this.calculateVolatility(historicalPrices.slice(-20));
        const trend = historicalPrices[historicalPrices.length - 1] >
                      this.signals.calculateSMA(historicalPrices, 50);
        fearGreed   = Math.max(0, Math.min(100, 50 + (trend ? 25 : -20) - (vol * 50)));
      }

      // BTC Dominance: use real data if present, otherwise proxy from trend
      let btcDominance;
      if (day.btc_dominance !== null && !isNaN(day.btc_dominance)) {
        btcDominance = day.btc_dominance;
      } else {
        const trend  = historicalPrices[historicalPrices.length - 1] >
                       this.signals.calculateSMA(historicalPrices, 50);
        btcDominance = 50 + (trend ? 15 : -5);
      }

      const signals   = this.calculateSignals(day.close, historicalPrices, fearGreed, btcDominance);
      const etfFlows7d = i >= 7
        ? (day.close - historicalData[i - 7].close) * 100000
        : 0;

      const currentPrices = {
        BTC:  day.close,
        ETH:  day.eth_close  || 0,
        SOL:  day.sol_close  || 0,
        RNDR: day.rndr_close || 0,
        FET:  day.fet_close  || 0,
        USD:  1
      };

      const context = {
        currentTimestamp: new Date(day.date),
        btcPrice:         day.close,
        btcDominance,
        fearGreedIndex:   fearGreed,
        etfFlows7d,
        portfolioValue:   this.calculatePortfolioValue(currentPrices),
        signals
      };

      const transition = this.stateMachine.evaluateTransition(context);

      if (transition.transitioned) {
        this.results.stateHistory.push({
          date:   day.date,
          from:   transition.from,
          to:     transition.to,
          reason: transition.reason
        });

        // Assets with price 0 are treated as zombies (don't exist yet for this date)
        const zombies = Object.keys(currentPrices).filter(a => currentPrices[a] === 0);
        this.executeRebalance(transition.to, currentPrices, zombies);

        if (this.config.verbose) {
          console.log(`${day.date} | ${transition.from} → ${transition.to} | BTC: $${day.close.toFixed(0)} | F&G: ${fearGreed.toFixed(0)}`);
        }
      }

      const currentValue = this.calculatePortfolioValue(currentPrices);

      this.results.dailySnapshots.push({
        date:        day.date,
        value:       currentValue,
        btcPrice:    day.close,
        state:       this.stateMachine.currentState,
        btcHoldings: this.portfolio.BTC,
        usdHoldings: this.portfolio.USD
      });

      if (currentValue > this.peakValue) this.peakValue = currentValue;
      const drawdown = (this.peakValue - currentValue) / this.peakValue;
      if (drawdown > this.results.maxDrawdown) this.results.maxDrawdown = drawdown;

      btcHoldValue = (this.config.startingCapital / btcStartPrice) * day.close;
    }

    // -------------------------------------------------------------------------
    // FINAL CALCULATIONS
    // -------------------------------------------------------------------------

    const lastDay    = historicalData[historicalData.length - 1];
    const finalPrices = {
      BTC:  lastDay.close,
      ETH:  lastDay.eth_close  || 0,
      SOL:  lastDay.sol_close  || 0,
      RNDR: lastDay.rndr_close || 0,
      FET:  lastDay.fet_close  || 0,
      USD:  1
    };

    this.results.finalValue    = this.calculatePortfolioValue(finalPrices);
    this.results.totalReturn   = ((this.results.finalValue - this.config.startingCapital) / this.config.startingCapital) * 100;
    this.results.btcHoldReturn = ((btcHoldValue - this.config.startingCapital) / this.config.startingCapital) * 100;
    this.results.alphaVsBTC    = this.results.totalReturn - this.results.btcHoldReturn;

    // Win rate — O(n) using per-symbol buy price stacks
    const buyStacks = {};
    let profitableSells = 0;
    let totalSells      = 0;
    for (const trade of this.results.trades) {
      if (trade.side === 'buy') {
        if (!buyStacks[trade.symbol]) buyStacks[trade.symbol] = [];
        buyStacks[trade.symbol].push(trade.price);
      } else if (trade.side === 'sell') {
        totalSells++;
        const stack    = buyStacks[trade.symbol];
        const buyPrice = stack && stack.length > 0 ? stack.shift() : null;
        if (buyPrice && trade.price > buyPrice) profitableSells++;
      }
    }
    this.results.winRate = totalSells > 0 ? (profitableSells / totalSells) * 100 : 0;

    // Time in market
    const daysInMarket = this.results.dailySnapshots.filter(
      s => s.state !== 'DORMANT' && s.state !== 'EXTRACTION'
    ).length;
    this.results.timeInMarket = (daysInMarket / this.results.dailySnapshots.length) * 100;

    // Daily returns for risk metrics
    const snapshots = this.results.dailySnapshots;
    const returns   = snapshots.slice(1).map((s, i) =>
      (s.value - snapshots[i].value) / snapshots[i].value
    );
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev    = Math.sqrt(
      returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    this.results.sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    // Sortino: downside deviation uses full return count in denominator (matches standard formula)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDev     = Math.sqrt(
      downsideReturns.reduce((a, r) => a + Math.pow(r, 2), 0) / returns.length
    );
    this.results.sortinoRatio = downsideDev > 0 ? (avgReturn / downsideDev) * Math.sqrt(252) : 0;

    if (this.config.verbose) this.printResults();
    return this.results;
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    const logReturns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
    const mean       = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance   = logReturns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / logReturns.length;
    return Math.sqrt(variance);
  }

  calculateStateAttribution() {
    const stats    = {};
    let prevValue  = this.config.startingCapital;

    this.results.dailySnapshots.forEach((snap, index) => {
      // Attribute PnL to the state held during the day (yesterday's state)
      // If we transitioned today, the gain/loss occurred before the transition
      const responsibleState = index > 0
        ? this.results.dailySnapshots[index - 1].state
        : 'DORMANT';

      if (!stats[responsibleState]) {
        stats[responsibleState] = { days: 0, returnSum: 0, minVal: snap.value, maxVal: snap.value };
      }

      const dailyRet = (snap.value - prevValue) / prevValue;
      stats[responsibleState].days++;
      stats[responsibleState].returnSum += dailyRet;
      stats[responsibleState].minVal = Math.min(stats[responsibleState].minVal, snap.value);
      stats[responsibleState].maxVal = Math.max(stats[responsibleState].maxVal, snap.value);

      prevValue = snap.value;
    });

    return stats;
  }

  printResults() {
    const r = this.results;
    const c = this.config;

    console.log('\n' + '='.repeat(70));
    console.log('📊 BACKTEST RESULTS');
    console.log('='.repeat(70) + '\n');
    console.log(`📅 Period:           ${c.startDate} → ${c.endDate}`);
    console.log(`🔢 Total Days:       ${r.dailySnapshots.length}`);
    console.log(`🔁 State Changes:    ${r.stateHistory.length}`);
    console.log(`💱 Trades Executed:  ${r.trades.length}\n`);
    console.log('💰 PERFORMANCE:');
    console.log(`   Starting Capital:  $${c.startingCapital.toFixed(2)}`);
    console.log(`   Final Value:       $${r.finalValue.toFixed(2)}`);
    console.log(`   Total Return:      ${r.totalReturn >= 0 ? '+' : ''}${r.totalReturn.toFixed(2)}%\n`);
    console.log('📈 VS BTC HOLD:');
    console.log(`   BTC Hold Return:   ${r.btcHoldReturn >= 0 ? '+' : ''}${r.btcHoldReturn.toFixed(2)}%`);
    console.log(`   Alpha:             ${r.alphaVsBTC >= 0 ? '+' : ''}${r.alphaVsBTC.toFixed(2)}%\n`);
    console.log('⚠️  RISK METRICS:');
    console.log(`   Max Drawdown:      ${(r.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`   Sharpe Ratio:      ${r.sharpeRatio.toFixed(2)}`);
    console.log(`   Sortino Ratio:     ${r.sortinoRatio.toFixed(2)}`);
    console.log(`   Win Rate:          ${r.winRate.toFixed(1)}%`);
    console.log(`   Time in Market:    ${r.timeInMarket.toFixed(1)}%\n`);

    const goalPct      = 28000;
    const progressRatio = Math.max(0, r.totalReturn / goalPct);
    const pBarWidth    = 40;
    const pFilled      = Math.min(pBarWidth, Math.round(progressRatio * pBarWidth));
    const pBar         = '█'.repeat(pFilled) + '░'.repeat(pBarWidth - pFilled);
    console.log(`🎯 GOAL TRACKER (Target: ${goalPct.toLocaleString()}%):`);
    console.log(`   [${pBar}] ${(progressRatio * 100).toFixed(1)}% of goal\n`);

    console.log('🔬 STRATEGY REFINEMENT (Per State Performance):');
    const stateStats = this.calculateStateAttribution();
    Object.entries(stateStats)
      .sort((a, b) => b[1].returnSum - a[1].returnSum)
      .forEach(([state, data]) => {
        const totalContrib = (data.returnSum * 100).toFixed(1);
        const avgDaily     = (data.returnSum / data.days * 100).toFixed(2);
        console.log(`   - ${state.padEnd(15)}: ${totalContrib.padStart(7)}% total (${String(data.days).padStart(4)} days, avg ${avgDaily}%/day)`);
      });

    console.log('\n' + '='.repeat(70));
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  exportResults(outputDir = DEFAULT_OUTPUT_DIR) {
    const outDir = path.resolve(outputDir);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const snapshotsCsv = [
      'date,portfolio_value,btc_price,state,btc_holdings,usd_holdings',
      ...this.results.dailySnapshots.map(s =>
        `${s.date},${s.value},${s.btcPrice},${s.state},${s.btcHoldings},${s.usdHoldings}`
      )
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'daily_snapshots.csv'), snapshotsCsv);

    const tradesCsv = [
      'date,side,symbol,amount,price,value',
      ...this.results.trades.map(t =>
        `${t.date},${t.side},${t.symbol},${t.amount},${t.price},${t.value}`
      )
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'trades.csv'), tradesCsv);

    const statesCsv = [
      'date,from_state,to_state,reason',
      ...this.results.stateHistory.map(s =>
        `${s.date},${s.from},${s.to},"${s.reason}"`
      )
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'state_history.csv'), statesCsv);

    const summary = {
      config:  this.config,
      results: {
        finalValue:     this.results.finalValue,
        totalReturn:    this.results.totalReturn,
        btcHoldReturn:  this.results.btcHoldReturn,
        alphaVsBTC:     this.results.alphaVsBTC,
        maxDrawdown:    this.results.maxDrawdown,
        sharpeRatio:    this.results.sharpeRatio,
        sortinoRatio:   this.results.sortinoRatio,
        winRate:        this.results.winRate,
        timeInMarket:   this.results.timeInMarket,
        totalTrades:    this.results.trades.length,
        stateChanges:   this.results.stateHistory.length
      }
    };
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

    console.log(`\n📁 Results exported to: ${outDir}/`);
    console.log('   - daily_snapshots.csv');
    console.log('   - trades.csv');
    console.log('   - state_history.csv');
    console.log('   - summary.json');
  }
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  const productionConfig = require('../config');
  const csvPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '..', 'data', 'btc_historical.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('\n❌ Error: Historical data file not found:', csvPath);
    console.error('\nUsage: node tests/backtest.js [path-to-csv]');
    console.error('Expected CSV format: date,open,high,low,close,volume');
    console.error('Optional columns:    fear_greed, btc_dominance, eth_close, sol_close, rndr_close, fet_close');
    console.error('\nExample: node tests/backtest.js ./data/btc_2013-2024.csv');
    process.exit(1);
  }

  const backtester = new Backtester({
    startingCapital:         300,
    startDate:               '2013-01-01',
    endDate:                 '2026-12-31',
    checkIntervalDays:       1,
    verbose:                 true,
    minDormantDays:          productionConfig.states.minDormantDays,
    ignitionTrailingStopPct: productionConfig.states.ignitionTrailingStopPct,
    minHoldDays:             productionConfig.states.minHoldDays
  });

  const historicalData = backtester.loadHistoricalData(csvPath);

  backtester.run(historicalData)
    .then(() => {
      backtester.exportResults();
      console.log('\n✅ Backtest complete!\n');
    })
    .catch(err => {
      console.error('\n❌ Backtest failed:', err.message);
      process.exit(1);
    });
}

module.exports = Backtester;