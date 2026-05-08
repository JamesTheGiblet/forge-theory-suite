// tests/strategy-tester.js
// Automated Strategy Optimizer for CCE
// Runs multiple backtest scenarios to find optimal parameters using composite scoring.

'use strict';

const fs          = require('fs');
const path        = require('path');
const Backtester  = require('./backtest');

const PROJECT_ROOT  = path.resolve(__dirname, '..');
const DEFAULT_CSV   = path.join(PROJECT_ROOT, 'data', 'btc_historical_merged.csv');
const RESULTS_DIR   = path.join(PROJECT_ROOT, 'optimization-results');
const BACKTEST_DIR  = path.join(PROJECT_ROOT, 'backtest-results');

class StrategyTester {
  constructor() {
    this.csvPath      = DEFAULT_CSV;
    this.resultsDir   = RESULTS_DIR;
    this.historicalData     = null;
    this.previousConfigs    = new Set();
    this.badTestsPath       = path.join(this.resultsDir, 'bad_tests.json');

    this.paramGrid = {
      minDormantDays:          [7, 14, 21, 30],
      ignitionTrailingStopPct: [0.03, 0.05, 0.08, 0.10],
      cascadeHoldDays:         [10, 14, 20, 25],
      anchorHoldDays:          [1, 3, 5]
    };

    this.baselineConfig = {
      minDormantDays:          14,
      ignitionTrailingStopPct: 0.05,
      minHoldDays: { IGNITION: 7, CASCADE_1: 14, CASCADE_2: 14, SPILLWAY: 7, ANCHOR: 5 }
    };
  }

  // ============================================================================
  // INIT
  // ============================================================================

  async initialize() {
    if (!fs.existsSync(this.csvPath)) {
      const fallback = path.join(PROJECT_ROOT, 'data', 'btc_historical.csv');
      if (fs.existsSync(fallback)) {
        console.warn(`⚠️  Merged data not found at ${this.csvPath}`);
        console.warn('   Falling back to BTC-only data (Altcoin states will be skipped).');
        this.csvPath = fallback;
      } else {
        console.error(`❌ Historical data not found: ${this.csvPath}`);
        console.error('   Run: node scripts/fetch-historical-data.js kraken 2013-01-01 2026-12-31');
        process.exit(1);
      }
    }

    console.log('📥 Loading historical data...');
    // historicalData is shared across all backtester instances — read-only, not mutated
    const loader = new Backtester({ verbose: false, startDate: '2013-01-01', endDate: '2026-12-31' });
    this.historicalData = loader.loadHistoricalData(this.csvPath);

    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    this.loadHistory();
  }

  loadHistory() {
    if (!fs.existsSync(this.resultsDir)) return;

    try {
      const files = fs.readdirSync(this.resultsDir).filter(
        f => f.startsWith('optimization_report_') && f.endsWith('.json') && !f.includes('latest')
      );

      if (files.length === 0) return;

      console.log(`📚 Scanning ${files.length} previous report(s) for duplicate configs...`);
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.resultsDir, file), 'utf8'));
          if (Array.isArray(data.allResults)) {
            data.allResults.forEach(res => {
              if (res.config) this.previousConfigs.add(this._hashConfig(res.config));
            });
          }
        } catch (e) {
          // Ignore corrupted report files
        }
      }

      console.log(`   ℹ️  ${this.previousConfigs.size} previously tested configuration(s) loaded.`);
    } catch (error) {
      console.warn('   ⚠️  Could not load history:', error.message);
    }
  }

  // ============================================================================
  // CONFIG HELPERS
  // ============================================================================

  /**
   * Deterministic hash for config deduplication.
   * Recursively sorts keys so insertion order doesn't affect equality —
   * fixes nested objects like minHoldDays where key order can vary.
   */
  _hashConfig(config) {
    const sortDeep = obj => {
      if (typeof obj !== 'object' || obj === null) return obj;
      return Object.keys(obj).sort().reduce((acc, k) => {
        acc[k] = sortDeep(obj[k]);
        return acc;
      }, {});
    };
    return JSON.stringify(sortDeep(config));
  }

  loadBaselineFromFile() {
    const summaryPath = path.join(BACKTEST_DIR, 'summary.json');
    if (!fs.existsSync(summaryPath)) return null;

    try {
      const data   = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      const result = {
        totalReturn: data.results.totalReturn,
        alphaVsBTC:  data.results.alphaVsBTC,
        maxDrawdown: data.results.maxDrawdown,
        sharpeRatio: data.results.sharpeRatio,
        winRate:     data.results.winRate,
        trades:      data.results.totalTrades
      };
      console.log(`   ℹ️  Loaded BASELINE from summary.json (Return: ${result.totalReturn.toFixed(0)}%)`);
      return {
        name:    'BASELINE (Production)',
        config:  data.config,
        metrics: result,
        score:   this.calculateScore(result)
      };
    } catch (err) {
      console.warn('   ⚠️  Failed to load baseline from summary.json:', err.message);
      return null;
    }
  }

  generateRandomConfig() {
    const randInt   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(3));
    return {
      minDormantDays:          randInt(5, 45),
      ignitionTrailingStopPct: randFloat(0.02, 0.12),
      minHoldDays: {
        IGNITION:  randInt(3, 10),
        CASCADE_1: randInt(10, 30),
        CASCADE_2: randInt(7, 21),
        SPILLWAY:  randInt(3, 14),
        ANCHOR:    randInt(2, 7)
      }
    };
  }

  generateScenarios() {
    const scenarios = [];

    // Use the config from the latest backtest as the baseline if available
    const fileBaseline = this.loadBaselineFromFile();
    const baseConfig   = fileBaseline ? fileBaseline.config : this.baselineConfig;

    // Always include baseline first for comparison
    scenarios.push({ name: 'BASELINE', config: baseConfig });

    for (const dormant of this.paramGrid.minDormantDays) {
      for (const stop of this.paramGrid.ignitionTrailingStopPct) {
        for (const cascadeHold of this.paramGrid.cascadeHoldDays) {
          for (const anchorHold of this.paramGrid.anchorHoldDays) {
            scenarios.push({
              name: `Dormant:${dormant}d | Stop:${(stop * 100).toFixed(0)}% | Cas1:${cascadeHold}d | Anc:${anchorHold}d`,
              config: {
                minDormantDays:          dormant,
                ignitionTrailingStopPct: stop,
                minHoldDays: { IGNITION: 7, CASCADE_1: cascadeHold, CASCADE_2: 14, SPILLWAY: 7, ANCHOR: anchorHold }
              }
            });
          }
        }
      }
    }

    // Filter duplicates — always keep BASELINE
    const seen           = new Set(this.previousConfigs);
    const uniqueScenarios = scenarios.filter(s => {
      if (s.name === 'BASELINE') return true;
      const hash = this._hashConfig(s.config);
      if (seen.has(hash)) return false;
      seen.add(hash); // Deduplicate within this run too
      return true;
    });

    const skipped = scenarios.length - uniqueScenarios.length;
    if (skipped > 0) {
      console.log(`   ✂️  Skipping ${skipped} duplicate scenario(s).`);
    }

    // Smart fill: add random configs until we have at least 10 unique tests
    let attempts = 0;
    while (uniqueScenarios.length < 10 && attempts < 50) {
      const rnd  = this.generateRandomConfig();
      const hash = this._hashConfig(rnd);
      if (!seen.has(hash)) {
        uniqueScenarios.push({
          name: `RANDOM | Dormant:${rnd.minDormantDays}d | Stop:${(rnd.ignitionTrailingStopPct * 100).toFixed(1)}%`,
          config: rnd
        });
        seen.add(hash);
      }
      attempts++;
    }

    return uniqueScenarios;
  }

  // ============================================================================
  // SCORING
  // ============================================================================

  /**
   * Composite score:
   *   50% weight — Sharpe Ratio (risk-adjusted return)
   *   30% weight — Total Return (log-scaled to dampen extreme values)
   *   20% weight — Drawdown penalty (exponential, disqualifies DD > 70%)
   */
  calculateScore(result) {
    const sharpe = result.sharpeRatio || 0;
    const ret    = result.totalReturn || 0;
    const dd     = result.maxDrawdown || 0;

    let ddPenalty = 1.0;
    if (dd > 0.40) ddPenalty = 0.8;
    if (dd > 0.50) ddPenalty = 0.5;
    if (dd > 0.60) ddPenalty = 0.2;
    if (dd > 0.70) ddPenalty = 0.0; // Disqualified

    const logReturn = Math.log10(Math.max(1, ret));
    return ((sharpe * 2.0) + (logReturn * 1.5)) * ddPenalty;
  }

  // ============================================================================
  // MAIN RUN
  // ============================================================================

  async run() {
    await this.initialize();
    const scenarios = this.generateScenarios();

    console.log(`\n🚀 Starting Optimization: ${scenarios.length} scenario(s)`);
    console.log('   Target: Maximise Sharpe Ratio & Return, Minimise Drawdown > 40%');
    console.log('='.repeat(80));
    console.log(`| ${'Scenario Name'.padEnd(35)} | ${'Return'.padStart(9)} | ${'Alpha'.padStart(9)} | ${'MaxDD'.padStart(7)} | ${'Sharpe'.padStart(6)} | ${'Score'.padStart(6)} |`);
    console.log('-'.repeat(80));

    const results      = [];
    let baselineResult = this.loadBaselineFromFile();
    let bestResult     = baselineResult || null;

    for (const scenario of scenarios) {
      const backtester = new Backtester({
        ...scenario.config,
        verbose:   false,
        startDate: '2013-01-01',
        endDate:   '2026-12-31'
      });

      try {
        const result = await backtester.run(this.historicalData);
        const score  = this.calculateScore(result);

        const summary = {
          name:    scenario.name,
          config:  scenario.config,
          metrics: {
            totalReturn: result.totalReturn,
            alphaVsBTC:  result.alphaVsBTC,
            maxDrawdown: result.maxDrawdown,
            sharpeRatio: result.sharpeRatio,
            winRate:     result.winRate,
            trades:      result.trades.length
          },
          score
        };

        results.push(summary);

        if (scenario.name === 'BASELINE' && !baselineResult) {
          baselineResult = summary;
        }

        if (!bestResult || score > bestResult.score) {
          bestResult = summary;
        }

        console.log(
          `| ${scenario.name.padEnd(35)} | ` +
          `${`${result.totalReturn.toFixed(0)}%`.padStart(9)} | ` +
          `${`${result.alphaVsBTC.toFixed(0)}%`.padStart(9)} | ` +
          `${`${(result.maxDrawdown * 100).toFixed(1)}%`.padStart(7)} | ` +
          `${result.sharpeRatio.toFixed(2).padStart(6)} | ` +
          `${score.toFixed(2).padStart(6)} |`
        );
      } catch (e) {
        console.error(`   ❌ Scenario "${scenario.name}" failed: ${e.message}`);
      }
    }

    if (!bestResult) {
      console.error('\n❌ All scenarios failed — no results to report.');
      return;
    }

    this._logBadTests(results);
    this._generateReport(results, baselineResult, bestResult);
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  _logBadTests(results) {
    const badTests = results.filter(r => {
      if (r.name.includes('BASELINE')) return false;
      return (
        r.metrics.maxDrawdown > 0.60 ||
        r.metrics.alphaVsBTC  < 0    ||
        r.metrics.sharpeRatio < 0.5
      );
    });

    if (badTests.length === 0) return;

    let existing = [];
    if (fs.existsSync(this.badTestsPath)) {
      try { existing = JSON.parse(fs.readFileSync(this.badTestsPath, 'utf8')); } catch (e) {}
    }

    const newEntries = badTests.map(t => {
      // Collect all failure reasons — a result can fail multiple criteria
      const reasons = [];
      if (t.metrics.maxDrawdown > 0.60) reasons.push('High Drawdown');
      if (t.metrics.alphaVsBTC  < 0)    reasons.push('Negative Alpha');
      if (t.metrics.sharpeRatio < 0.5)  reasons.push('Low Sharpe');
      return {
        date:    new Date().toISOString(),
        name:    t.name,
        config:  t.config,
        metrics: t.metrics,
        reasons
      };
    });

    fs.writeFileSync(this.badTestsPath, JSON.stringify([...existing, ...newEntries], null, 2));
    console.log(`\n   📉 Logged ${newEntries.length} failed configuration(s) to bad_tests.json`);
  }

  _generateReport(results, baseline, best) {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 OPTIMIZATION RESULTS\n');

    if (!baseline) {
      console.log('   ⚠️  No baseline available for comparison.');
    } else if (best.name === 'BASELINE' || best.name === 'BASELINE (Production)') {
      console.log('✅ The BASELINE strategy is currently the optimal configuration.');
      console.log('   No parameter changes recommended.');
    } else {
      console.log(`🎉 NEW OPTIMAL CONFIGURATION: "${best.name}"\n`);
      console.log('Comparison vs Baseline:');

      const diffRet    = best.metrics.totalReturn   - baseline.metrics.totalReturn;
      const diffSharpe = best.metrics.sharpeRatio   - baseline.metrics.sharpeRatio;
      const diffDD     = (best.metrics.maxDrawdown  - baseline.metrics.maxDrawdown) * 100;

      console.log(`   Return:   ${baseline.metrics.totalReturn.toFixed(0)}% → ${best.metrics.totalReturn.toFixed(0)}% (${diffRet >= 0 ? '+' : ''}${diffRet.toFixed(0)}%)`);
      console.log(`   Sharpe:   ${baseline.metrics.sharpeRatio.toFixed(2)} → ${best.metrics.sharpeRatio.toFixed(2)} (${diffSharpe >= 0 ? '+' : ''}${diffSharpe.toFixed(2)})`);
      console.log(`   Drawdown: ${(baseline.metrics.maxDrawdown * 100).toFixed(1)}% → ${(best.metrics.maxDrawdown * 100).toFixed(1)}% (${diffDD >= 0 ? '+' : ''}${diffDD.toFixed(1)}%)`);
      console.log('\nRecommended Config Update:');
      console.log(JSON.stringify(best.config, null, 2));
    }

    // Build report payload once — written to both timestamped and latest files
    const reportPayload = {
      generatedAt: new Date().toISOString(),
      bestConfig:  best,
      baseline:    baseline,
      allResults:  [...results].sort((a, b) => b.score - a.score)
    };

    const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportPath = path.join(this.resultsDir, `optimization_report_${timestamp}.json`);
    const latestPath = path.join(this.resultsDir, 'optimization_report_latest.json');
    const payload    = JSON.stringify(reportPayload, null, 2);

    fs.writeFileSync(reportPath, payload);
    fs.writeFileSync(latestPath, payload);

    console.log(`\n📄 Report saved: ${reportPath}`);
  }
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  const tester = new StrategyTester();
  tester.run().catch(err => {
    console.error('\n❌ Optimizer failed:', err.message);
    process.exit(1);
  });
}

module.exports = StrategyTester;