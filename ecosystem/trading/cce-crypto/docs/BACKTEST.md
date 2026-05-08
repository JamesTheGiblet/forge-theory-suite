# Backtesting
### CCE Platform — Historical Strategy Validation

**Status:** 🔵 Planned — pipeline infrastructure ready, runner not yet built

---

## Overview

The CCE backtest system runs an engine's FSM against historical price data
to validate strategy performance before deploying real capital. It uses the
same signal logic, state machine, and allocation rules as the live engine —
the only difference is the data source (historical vs live).

---

## The 5-Step Pipeline

Backtesting is Step 5 of the CCE AI Framework Pipeline:
STEP 1  Target Definition    — hypothesis locked, asset universe defined
STEP 2  Data Gathering       — 10yr historical data collected
STEP 3  State Analysis       — market phases identified, temporal lags measured
STEP 4  Strategy Generation  — FSM generated from state map
STEP 5  Backtest & Signoff ← — IS/OOS split, walk-forward, stress tests
Run the full pipeline:
```bash
node pipeline/cce-pipeline.js --target pipeline/targets/my-target.json
IS/OOS Split
Every backtest uses a strict in-sample / out-of-sample split:
2013 ─────────────────── 2020 │ 2020 ──── 2023
        IN SAMPLE (7yr)       │  OUT OF SAMPLE (3yr)
        Strategy fitted here  │  Validated here — never touched during fitting
A strategy that performs well IS but fails OOS is overfit.
CCE only signs off on strategies that pass OOS validation.
Metrics Card
Every validated strategy generates a signed metrics card:
╔══════════════════════════════════════════════╗
║  CCE METRICS CARD — PIPELINE SIGNED          ║
║  Engine: se-crypto | Version: 2.4.0          ║
╠══════════════════════════════════════════════╣
║  IS CAGR:          +47.2%                    ║
║  OOS CAGR:         +31.8%                    ║
║  OOS Sharpe:        1.84                     ║
║  Max Drawdown:     -38.4%                    ║
║  Win Rate:          67%                      ║
║  OOS/IS Ratio:      0.67  (>0.5 = pass)      ║
║  Walk-Forward:      PASS                     ║
║  Bear Market:       PASS                     ║
╚══════════════════════════════════════════════╝
Running a Backtest (when built)
# Full pipeline (recommended)
node pipeline/cce-pipeline.js --target pipeline/targets/se-crypto.json

# Backtest only (step 5)
node pipeline/cce-pipeline.js \
  --resume pipeline/runs/run_2026-03-25/ \
  --from-step 5

# Quick backtest against existing data
node scripts/backtest.js --engine se-crypto --years 10
Target Spec Format
Create pipeline/targets/my-engine.json:
{
  "id": "se-crypto",
  "hypothesis": "BTC capital rotation from dominance to alts can be exploited with a temporal lag FSM",
  "asset_universe": ["BTC", "ETH", "SOL"],
  "history_years": 10,
  "in_sample_years": 7,
  "out_of_sample_years": 3,
  "success_criteria": {
    "min_oos_cagr": 0.15,
    "min_sharpe": 1.0,
    "max_drawdown": -0.50,
    "min_oos_is_ratio": 0.50
  }
}
Stress Tests
The pipeline runs three mandatory stress tests:
Test
Description
Pass Condition
Bear Market 2018
Nov 2017 – Dec 2018 crash
Portfolio > 60% of peak
Bear Market 2022
Nov 2021 – Jan 2023 crash
Portfolio > 60% of peak
Sideways 2019
Jan–Sep 2019 consolidation
No negative CAGR
Walk-Forward Validation
Splits the OOS period into 6 windows and tests each independently:
Window 1: Jan–Jun 2020
Window 2: Jul–Dec 2020
Window 3: Jan–Jun 2021
...
All 6 windows must show positive returns for walk-forward PASS.
Live Performance vs Backtest
Metric
Backtest (10yr)
Live (17 days)
CAGR
~37,757% total
+107.7%
State
Historical
DORMANT
Capital
Simulated
$813.54 real
Live performance will diverge from backtest — this is expected and healthy.
The backtest validates the strategy logic. Live trading validates execution.
Implementation Status
Component
Status
Pipeline runner
🔵 Not built
Target spec format
✅ Defined
Metrics card format
✅ Defined
IS/OOS split logic
🔵 Not built
Walk-forward validator
🔵 Not built
Stress test scenarios
🔵 Not built
Backtest Replay UI
✅ Built (localhost:3001/forge/replay)
Giblets Creations · v2.4.0 · March 2026
