// pipeline/steps/step1-target-definition.js
// STEP 1 — TARGET DEFINITION
// Loads and validates the target spec JSON.
// No data is fetched. No code is written. Pure definition.

'use strict';

const fs   = require('fs');
const path = require('path');

class Step1_TargetDefinition {

  constructor(targetPath, runDir) {
    this.targetPath = targetPath;
    this.runDir     = runDir;
  }

  async execute() {
    console.log('[STEP 1] Loading target spec...');

    if (!fs.existsSync(this.targetPath)) {
      throw new Error(`Target spec not found: ${this.targetPath}`);
    }

    const raw  = fs.readFileSync(this.targetPath, 'utf8');
    const spec = JSON.parse(raw);

    // Compute derived fields
    const today     = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - (spec.time_window?.history_years || 10));

    spec.time_window = spec.time_window || {};
    spec.time_window.start_date = spec.time_window.start_date || startDate.toISOString().slice(0, 10);
    spec.time_window.end_date   = spec.time_window.end_date   || today.toISOString().slice(0, 10);

    console.log(`[STEP 1] Hypothesis: ${spec.hypothesis}`);
    console.log(`[STEP 1] Assets: ${spec.asset_universe?.map(a => a.symbol).join(', ')}`);
    console.log(`[STEP 1] Window: ${spec.time_window.start_date} → ${spec.time_window.end_date}`);
    console.log(`[STEP 1] States: ${spec.state_map_draft?.map(s => s.state_name).join(', ')}`);

    return spec;
  }
}

module.exports = Step1_TargetDefinition;

// ─────────────────────────────────────────────────────────────────────────────

// pipeline/steps/step2-data-gathering.js
// STEP 2 — DATA GATHERING AND REPORT
// Fetches historical data for all assets in the universe.
// Computes all required indicators.
// Runs temporal lag analysis.
// Generates analytics report.

// IMPLEMENT: connect to your data sources
// CCE already has: Kraken OHLCV, CoinGecko dominance, alternative.me F&G, Yahoo Finance
// The step should call these existing data feeds and compute the required indicators.

// class Step2_DataGathering { ... }
// module.exports = Step2_DataGathering;

// ─────────────────────────────────────────────────────────────────────────────

// pipeline/steps/step3-state-analysis.js
// STEP 3 — STATE AND PATTERN ANALYSIS
// Identifies full market cycles from price history.
// Measures temporal lag between lead and follower assets per cycle.
// Formalises the state map with entry/exit conditions grounded in data.

// IMPLEMENT: cycle identification, lag measurement, state map formalisation
// Input: analytics_report from STEP 2
// Output: { stateMap, temporalProfile }

// class Step3_StateAnalysis { ... }
// module.exports = Step3_StateAnalysis;

// ─────────────────────────────────────────────────────────────────────────────

// pipeline/steps/step4-strategy-generation.js
// STEP 4 — STRATEGY GENERATION
// Translates state map and temporal profile into executable engine code.
// Writes config.js, state_machine.js, signals.js, portfolio.js, risk.js
// Runs the 10-year simulation and validates gate conditions.

// IMPLEMENT: code generation from state map schema
// The CCE engine template is the scaffold — generate a filled-in version
// Input: stateMap, temporalProfile, targetSpec
// Output: { strategyDir, runs_without_errors, trade_count, tests_pass, ... }

// class Step4_StrategyGeneration { ... }
// module.exports = Step4_StrategyGeneration;

// ─────────────────────────────────────────────────────────────────────────────

// pipeline/steps/step5-backtest-refinement.js
// STEP 5 — BACKTEST REFINEMENT AND SIGNOFF
// Runs IS and OOS backtests.
// Evaluates against success criteria.
// If failing: runs refinement protocol (max 5 cycles).
// Produces signed metrics_card on success.

// IMPLEMENT: IS/OOS split, walk-forward, stress tests, refinement protocol
// The CCE backtest.js is the foundation — extend it with OOS split
// Input: strategyCodebase, analyticsReport, targetSpec, refinementCycle
// Output: metrics_card object

// class Step5_BacktestRefinement { ... }
// module.exports = Step5_BacktestRefinement;
