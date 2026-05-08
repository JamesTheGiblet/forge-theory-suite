// pipeline/cce-pipeline.js
// CCE Core Framework — AI Framework Pipeline Runner
//
// Executes the CCE_AI_Framework.md 5-step pipeline against any market.
// Each step enforces its gate before proceeding.
// Rollback targets are honoured on gate failure.
//
// Usage:
//   node pipeline/cce-pipeline.js --target pipeline/targets/forex-eurusd.json
//   node pipeline/cce-pipeline.js --target pipeline/targets/crypto-btc.json
//   node pipeline/cce-pipeline.js --resume pipeline/runs/run_20260324/
//
// Output:
//   pipeline/runs/run_<timestamp>/
//     ├── target_spec.json        — STEP 1 output
//     ├── analytics_report.json   — STEP 2 output
//     ├── state_map.json          — STEP 3 output
//     ├── strategy/               — STEP 4 output (generated engine)
//     ├── backtest_results/       — STEP 5 output
//     ├── metrics_card.json       — final sign-off
//     └── pipeline.log            — full execution log

'use strict';

const fs   = require('fs');
const path = require('path');

// Pipeline steps
const Step1_TargetDefinition    = require('./steps/step1-target-definition');
const Step2_DataGathering       = require('./steps/step2-data-gathering');
const Step3_StateAnalysis       = require('./steps/step3-state-analysis');
const Step4_StrategyGeneration  = require('./steps/step4-strategy-generation');
const Step5_BacktestRefinement  = require('./steps/step5-backtest-refinement');

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const RUNS_DIR = path.join(process.cwd(), 'pipeline', 'runs');
const MAX_REFINEMENT_CYCLES = 5;

// ── PIPELINE RUNNER ───────────────────────────────────────────────────────────

class CCEPipeline {

  constructor(targetPath, options = {}) {
    this.targetPath = targetPath;
    this.options    = options;

    // Run directory — unique per execution
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.runDir = options.resumeDir || path.join(RUNS_DIR, `run_${ts}`);

    this.log     = [];
    this.state   = {
      step:               0,
      refinementCycles:   0,
      targetSpec:         null,
      analyticsReport:    null,
      stateMap:           null,
      temporalProfile:    null,
      strategyCodebase:   null,
      metricsCard:        null,
      status:             'PENDING'  // PENDING | RUNNING | COMPLETE | FAILED | ROLLED_BACK
    };
  }

  // ── RUN ───────────────────────────────────────────────────────────────────
  // Main entry point. Executes all 5 steps sequentially with gate enforcement.

  async run() {
    this._ensureRunDir();
    this._emit('PIPELINE START', `Run directory: ${this.runDir}`);
    this.state.status = 'RUNNING';

    try {

      // ── STEP 1: TARGET DEFINITION ──────────────────────────────────────────
      this.state.step = 1;
      this._emit('STEP 1', 'TARGET DEFINITION');
      const step1 = new Step1_TargetDefinition(this.targetPath, this.runDir);
      this.state.targetSpec = await step1.execute();
      this._saveState('target_spec.json', this.state.targetSpec);

      const gate1 = this._evaluateGate1(this.state.targetSpec);
      if (!gate1.pass) {
        this._emit('GATE 01 FAIL', gate1.failures.join(', '));
        this._emit('ACTION', 'HALT — cannot proceed without valid target spec');
        this.state.status = 'FAILED';
        this._saveLog();
        return this._result();
      }
      this._emit('GATE 01 PASS', 'Proceeding to STEP 2');

      // ── STEP 2: DATA GATHERING ─────────────────────────────────────────────
      this.state.step = 2;
      this._emit('STEP 2', 'DATA GATHERING AND REPORT');
      const step2 = new Step2_DataGathering(this.state.targetSpec, this.runDir);
      this.state.analyticsReport = await step2.execute();
      this._saveState('analytics_report.json', this.state.analyticsReport);

      const gate2 = this._evaluateGate2(this.state.analyticsReport);
      if (!gate2.pass) {
        this._emit('GATE 02 FAIL', gate2.failures.join(', '));
        if (gate2.failures.some(f => f.includes('G02-D'))) {
          this._emit('ACTION', 'Temporal hypothesis not supported by data — HALT, revise hypothesis');
          this.state.status = 'FAILED';
        } else {
          this._emit('ACTION', 'Fix data gaps and retry STEP 2');
          this.state.status = 'FAILED';
        }
        this._saveLog();
        return this._result();
      }
      this._emit('GATE 02 PASS', 'Proceeding to STEP 3');

      // ── STEP 3: STATE AND PATTERN ANALYSIS ────────────────────────────────
      this.state.step = 3;
      this._emit('STEP 3', 'STATE AND PATTERN ANALYSIS');
      const step3 = new Step3_StateAnalysis(
        this.state.analyticsReport,
        this.state.targetSpec,
        this.runDir
      );
      const step3Result = await step3.execute();
      this.state.stateMap        = step3Result.stateMap;
      this.state.temporalProfile = step3Result.temporalProfile;
      this._saveState('state_map.json',        this.state.stateMap);
      this._saveState('temporal_profile.json', this.state.temporalProfile);

      const gate3 = this._evaluateGate3(this.state.stateMap, this.state.temporalProfile);
      if (!gate3.pass) {
        this._emit('GATE 03 FAIL', gate3.failures.join(', '));
        if (gate3.failures.some(f => f.includes('G03-A'))) {
          this._emit('ROLLBACK', 'STEP 2 — data window insufficient, extend time range');
        } else if (gate3.failures.some(f => f.includes('G03-B'))) {
          this._emit('ROLLBACK', 'STEP 1 — temporal hypothesis not supported, revise');
        } else {
          this._emit('ACTION', 'Fix state map and retry GATE 3');
        }
        this.state.status = 'ROLLED_BACK';
        this._saveLog();
        return this._result();
      }
      this._emit('GATE 03 PASS', 'Proceeding to STEP 4');

      // ── STEP 4: STRATEGY GENERATION ───────────────────────────────────────
      this.state.step = 4;
      this._emit('STEP 4', 'STRATEGY GENERATION');
      const step4 = new Step4_StrategyGeneration(
        this.state.stateMap,
        this.state.temporalProfile,
        this.state.targetSpec,
        this.runDir
      );
      this.state.strategyCodebase = await step4.execute();
      this._saveState('strategy_manifest.json', this.state.strategyCodebase);

      const gate4 = this._evaluateGate4(this.state.strategyCodebase);
      if (!gate4.pass) {
        this._emit('GATE 04 FAIL', gate4.failures.join(', '));
        this._emit('ACTION', 'Fix code errors and retry STEP 4');
        this.state.status = 'FAILED';
        this._saveLog();
        return this._result();
      }
      this._emit('GATE 04 PASS', 'Proceeding to STEP 5');

      // ── STEP 5: BACKTEST REFINEMENT ───────────────────────────────────────
      this.state.step = 5;
      let approved = false;

      while (!approved && this.state.refinementCycles <= MAX_REFINEMENT_CYCLES) {

        this._emit('STEP 5', `BACKTEST AND REFINEMENT (cycle ${this.state.refinementCycles + 1}/${MAX_REFINEMENT_CYCLES})`);

        const step5 = new Step5_BacktestRefinement(
          this.state.strategyCodebase,
          this.state.analyticsReport,
          this.state.targetSpec,
          this.runDir,
          this.state.refinementCycles
        );
        this.state.metricsCard = await step5.execute();
        this._saveState(`metrics_card_cycle${this.state.refinementCycles}.json`, this.state.metricsCard);

        const gate5 = this._evaluateGate5(this.state.metricsCard, this.state.targetSpec);

        if (gate5.pass) {
          approved = true;
          this.state.metricsCard.deploy_status = 'APPROVED';
          this.state.metricsCard.approval_reason = 'All gate conditions met';
          this._emit('GATE 05 PASS', 'STRATEGY APPROVED FOR DEPLOYMENT');
        } else {
          this.state.refinementCycles++;
          this._emit('GATE 05 FAIL', gate5.failures.join(', '));

          if (this.state.refinementCycles >= MAX_REFINEMENT_CYCLES) {
            this._emit('ROLLBACK', 'STEP 3 — 5 refinement cycles exhausted, hypothesis requires revision');
            this.state.status = 'ROLLED_BACK';
            this.state.metricsCard.deploy_status = 'NOT_APPROVED';
            this.state.metricsCard.approval_reason = gate5.failures.join('; ');
            break;
          }

          this._emit('REFINEMENT', `Cycle ${this.state.refinementCycles} — adjusting parameters`);
          // Step 5 handles internal refinement protocol
        }
      }

      this._saveState('metrics_card.json', this.state.metricsCard);

      if (approved) {
        this.state.status = 'COMPLETE';
        this._emit('PIPELINE COMPLETE', 'STRATEGY APPROVED FOR DEPLOYMENT');
        this._printMetricsCard(this.state.metricsCard);
      } else {
        this._emit('PIPELINE COMPLETE', 'STRATEGY NOT APPROVED — see metrics_card.json');
      }

    } catch (err) {
      this._emit('PIPELINE ERROR', err.message);
      this.state.status = 'FAILED';
    }

    this._saveLog();
    return this._result();
  }

  // ── GATE EVALUATORS ───────────────────────────────────────────────────────

  _evaluateGate1(spec) {
    const failures = [];
    if (!spec?.hypothesis || spec.hypothesis.split('.').length < 1)
      failures.push('G01-A: hypothesis must be exactly one sentence');
    if (!spec?.hypothesis?.match(/\b(day|lag|delay|before|after|week|hour)\b/i))
      failures.push('G01-B: hypothesis must reference temporal pattern');
    if (!spec?.asset_universe || spec.asset_universe.length < 2)
      failures.push('G01-C: asset_universe must have >= 2 assets');
    if (!spec?.asset_universe?.some(a => a.role === 'lead'))
      failures.push('G01-D: asset_universe must include >= 1 lead asset');
    if (!spec?.asset_universe?.some(a => a.role === 'follower'))
      failures.push('G01-E: asset_universe must include >= 1 follower asset');
    if (!spec?.state_map_draft || spec.state_map_draft.length < 3)
      failures.push('G01-F: state_map_draft must have >= 3 states');
    if (!spec?.state_map_draft?.some(s => s.allocation === 'CASH'))
      failures.push('G01-G: state_map_draft must include >= 1 CASH state');
    if (!spec?.success_criteria || Object.values(spec.success_criteria).some(v => v == null))
      failures.push('G01-H: all success_criteria fields must be numeric and non-null');
    return { pass: failures.length === 0, failures };
  }

  _evaluateGate2(report) {
    const failures = [];
    if (!report?.data_quality?.no_large_gaps)
      failures.push('G02-A: price data has gaps > 7 days');
    if (!report?.indicators_complete)
      failures.push('G02-B: not all required indicators present');
    if (!report?.temporal_lag_analysis?.complete)
      failures.push('G02-C: temporal lag analysis incomplete');
    if (!report?.temporal_lag_analysis?.pairs?.some(p => p.confidence === 'HIGH' || p.confidence === 'MEDIUM'))
      failures.push('G02-D: no pair with confidence >= MEDIUM — temporal hypothesis may be unsupported');
    if (!report?.spot_check_passed)
      failures.push('G02-E: spot-check validation failed');
    if (!report?.export_complete)
      failures.push('G02-F: analytics report not fully generated');
    return { pass: failures.length === 0, failures };
  }

  _evaluateGate3(stateMap, temporalProfile) {
    const failures = [];
    if (!temporalProfile?.cycles_analysed || temporalProfile.cycles_analysed < 3)
      failures.push('G03-A: cycles_analysed must be >= 3');
    if (!temporalProfile?.pairs?.some(p => p.use_in_strategy))
      failures.push('G03-B: no pair with confidence >= MEDIUM to use in strategy');
    if (!stateMap || stateMap.length < 3)
      failures.push('G03-C: state_map must have >= 3 states');
    if (!stateMap?.some(s => s.state_type === 'RISK_OFF'))
      failures.push('G03-D: state_map must include >= 1 RISK_OFF state');
    if (!stateMap?.some(s => s.state_type === 'EMERGENCY'))
      failures.push('G03-E: state_map must include >= 1 EMERGENCY state');
    if (stateMap?.some(s => !s.entry_condition || !s.exit_condition))
      failures.push('G03-F: every state must have entry and exit conditions');
    if (stateMap?.some(s => !s.portfolio || Math.abs(s.portfolio.allocations.reduce((a, x) => a + x.weight, 0) - 1.0) > 0.001))
      failures.push('G03-G: portfolio weights must sum to 1.0 in every state');
    const conditions = stateMap?.map(s => s.entry_condition) || [];
    if (new Set(conditions).size !== conditions.length)
      failures.push('G03-H: state entry conditions must be unique');
    return { pass: failures.length === 0, failures };
  }

  _evaluateGate4(codebase) {
    const failures = [];
    if (!codebase?.runs_without_errors)
      failures.push('G04-A: strategy does not run end-to-end without errors');
    if (codebase?.hardcoded_values_found)
      failures.push('G04-B: hardcoded numeric values found outside config');
    if (!codebase?.transitions_logged)
      failures.push('G04-C: not all state transitions logged');
    if (!codebase?.portfolio_weights_valid)
      failures.push('G04-D: portfolio weights do not sum to 1.0 at all times');
    if (!codebase?.emergency_triggered)
      failures.push('G04-E: EMERGENCY state never triggered in 10-year simulation');
    if (!codebase?.tests_pass)
      failures.push('G04-F: unit tests do not all pass');
    if (!codebase?.trade_count || codebase.trade_count < 10)
      failures.push('G04-G: fewer than 10 trades across 10-year simulation');
    return { pass: failures.length === 0, failures };
  }

  _evaluateGate5(metricsCard, targetSpec) {
    const failures = [];
    const sc = targetSpec?.success_criteria || {};

    if (metricsCard?.oos_cagr < (sc.min_cagr_oos || 0.30))
      failures.push(`G05-A: OOS CAGR ${(metricsCard.oos_cagr * 100).toFixed(1)}% < required ${((sc.min_cagr_oos || 0.30) * 100).toFixed(1)}%`);
    if (metricsCard?.oos_sharpe < (sc.min_sharpe_oos || 1.5))
      failures.push(`G05-B: OOS Sharpe ${metricsCard.oos_sharpe?.toFixed(2)} < required ${sc.min_sharpe_oos || 1.5}`);
    if (metricsCard?.oos_max_drawdown > (sc.max_drawdown_oos || 0.30))
      failures.push(`G05-C: OOS MaxDD ${(metricsCard.oos_max_drawdown * 100).toFixed(1)}% > allowed ${((sc.max_drawdown_oos || 0.30) * 100).toFixed(1)}%`);
    if (metricsCard?.oos_calmar < (sc.min_calmar_oos || 1.0))
      failures.push(`G05-D: OOS Calmar ${metricsCard.oos_calmar?.toFixed(2)} < required ${sc.min_calmar_oos || 1.0}`);
    if (metricsCard?.oos_is_ratio < (sc.min_oos_is_cagr_ratio || 0.6))
      failures.push(`G05-E: OOS/IS ratio ${metricsCard.oos_is_ratio?.toFixed(2)} < required ${sc.min_oos_is_cagr_ratio || 0.6}`);
    if (!metricsCard?.oos_total_trades || metricsCard.oos_total_trades < 30)
      failures.push(`G05-F: OOS trades ${metricsCard?.oos_total_trades} < minimum 30`);
    if (!metricsCard?.outperforms_benchmark)
      failures.push('G05-G: strategy does not outperform benchmark on Sharpe AND Calmar');
    if (Object.values(metricsCard || {}).some(v => v == null))
      failures.push('G05-H: metrics_card has null fields');
    if (!metricsCard?.code_version_tag)
      failures.push('G05-I: code_version_tag not set');

    return { pass: failures.length === 0, failures };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  _emit(event, message) {
    const entry = `[${new Date().toISOString()}] [${event}] ${message}`;
    console.log(entry);
    this.log.push(entry);
  }

  _saveState(filename, data) {
    if (!data) return;
    fs.writeFileSync(
      path.join(this.runDir, filename),
      JSON.stringify(data, null, 2)
    );
  }

  _saveLog() {
    fs.writeFileSync(
      path.join(this.runDir, 'pipeline.log'),
      this.log.join('\n')
    );
  }

  _ensureRunDir() {
    fs.mkdirSync(this.runDir, { recursive: true });
  }

  _printMetricsCard(card) {
    if (!card) return;
    console.log('\n' + '═'.repeat(60));
    console.log('  METRICS CARD');
    console.log('═'.repeat(60));
    console.log(`  Strategy:     ${card.strategy_name}`);
    console.log(`  Deploy:       ${card.deploy_status}`);
    console.log('─'.repeat(60));
    console.log(`  OOS CAGR:     ${((card.oos_cagr || 0) * 100).toFixed(1)}%`);
    console.log(`  OOS Sharpe:   ${card.oos_sharpe?.toFixed(2)}`);
    console.log(`  OOS MaxDD:    ${((card.oos_max_drawdown || 0) * 100).toFixed(1)}%`);
    console.log(`  OOS Calmar:   ${card.oos_calmar?.toFixed(2)}`);
    console.log(`  OOS/IS Ratio: ${card.oos_is_ratio?.toFixed(2)}`);
    console.log(`  OOS Trades:   ${card.oos_total_trades}`);
    console.log(`  Beats BM:     ${card.outperforms_benchmark ? 'YES' : 'NO'}`);
    console.log('═'.repeat(60) + '\n');
  }

  _result() {
    return {
      status:      this.state.status,
      step:        this.state.step,
      runDir:      this.runDir,
      metricsCard: this.state.metricsCard
    };
  }

}

// ── CLI ENTRY ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  const targetFlag = args.indexOf('--target');
  const resumeFlag = args.indexOf('--resume');

  if (targetFlag === -1 && resumeFlag === -1) {
    console.log('Usage:');
    console.log('  node pipeline/cce-pipeline.js --target pipeline/targets/my-target.json');
    console.log('  node pipeline/cce-pipeline.js --resume pipeline/runs/run_2026-03-24/');
    process.exit(1);
  }

  const targetPath = targetFlag !== -1 ? args[targetFlag + 1] : null;
  const resumeDir  = resumeFlag !== -1 ? args[resumeFlag + 1] : null;

  const pipeline = new CCEPipeline(targetPath, { resumeDir });
  pipeline.run().then(result => {
    console.log(`\nPipeline ${result.status} — output: ${result.runDir}`);
    process.exit(result.status === 'COMPLETE' ? 0 : 1);
  });
}

module.exports = CCEPipeline;
