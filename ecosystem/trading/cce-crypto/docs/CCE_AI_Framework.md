# CCE_FRAMEWORK_SPEC — VERSION 1.0
# Cascade Compounding Engine: Generic AI Development Plan
# FORMAT: Machine-readable specification. All fields are typed and deterministic.
# AUDIENCE: AI agent executing a CCE strategy development pipeline.
# USAGE: Parse this document top-to-bottom. Execute each STEP in sequence.
#        Do not proceed to STEP N+1 until GATE_N evaluates to PASS.

---

## DOCUMENT_METADATA

```
document_id:        CCE_FRAMEWORK_SPEC_v1.0
document_type:      EXECUTABLE_SPECIFICATION
execution_model:    SEQUENTIAL_WITH_GATES
total_steps:        5
rollback_targets:   defined per gate
variables:          all bracketed [LIKE_THIS] are runtime-resolved at execution
```

---

## DEFINITIONS

```
TERM              TYPE        DEFINITION
─────────────────────────────────────────────────────────────────────────
TARGET            object      The market, asset universe, and hypothesis the strategy exploits
ASSET_UNIVERSE    list[str]   All instruments the strategy may trade (e.g. ["BTC","ETH","SOL"])
HYPOTHESIS        str         One falsifiable sentence describing the temporal pattern being exploited
STATE             enum        A named, discrete market regime with defined entry + exit conditions
STATE_MACHINE     object      Set of all STATES + transition rules between them
TEMPORAL_LAG      int         Number of days between a lead asset's signal and a follower asset's move
TEMPORAL_SIGNAL   bool        A computed indicator: was asset X above condition Y, N days ago?
IN_SAMPLE         str         Data window used for fitting: years 1–7 of the dataset
OUT_OF_SAMPLE     str         Data window used for validation: years 8–10 of the dataset
GATE              object      A set of boolean conditions ALL of which must be TRUE to proceed
ROLLBACK          instruction If GATE fails: return to the specified prior STEP
METRICS_CARD      object      Final summary of validated strategy performance
```

---

## PIPELINE_OVERVIEW

```
STEP_01: TARGET_DEFINITION
         INPUT:  none
         OUTPUT: target_spec object
         GATE:   gate_01
         ON_FAIL: halt — cannot proceed without valid target

STEP_02: DATA_GATHERING_AND_REPORT
         INPUT:  target_spec
         OUTPUT: dataset object + analytics_report object
         GATE:   gate_02
         ON_FAIL: fix data gaps → retry STEP_02

STEP_03: STATE_AND_PATTERN_ANALYSIS
         INPUT:  analytics_report
         OUTPUT: state_map object + temporal_delay_profile object
         GATE:   gate_03
         ON_FAIL: return to STEP_02 if data insufficient; else revise hypothesis

STEP_04: STRATEGY_GENERATION
         INPUT:  state_map + temporal_delay_profile
         OUTPUT: strategy_codebase object
         GATE:   gate_04
         ON_FAIL: fix code errors → retry STEP_04

STEP_05: BACKTEST_REFINEMENT_AND_SIGNOFF
         INPUT:  strategy_codebase + dataset
         OUTPUT: metrics_card object
         GATE:   gate_05
         ON_FAIL: see refinement_protocol; max 5 refinement cycles before ROLLBACK to STEP_03
```

---

## STEP_01 — TARGET_DEFINITION

### PURPOSE
```
Lock the scope of the strategy before any data is collected or code is written.
Ambiguity at this stage propagates into every downstream step.
This step is purely definitional. No data is fetched. No code is written.
```

### REQUIRED_OUTPUTS

```yaml
target_spec:
  hypothesis:
    type: string
    constraints:
      - exactly one sentence
      - must be falsifiable (testable against historical data)
      - must reference a temporal pattern explicitly
    example: "Large-cap altcoins (ETH, SOL) lag BTC by 3–7 days during crypto bull markets."

  asset_universe:
    type: list[object]
    each_item:
      symbol:    string   # ticker e.g. "BTC"
      rationale: string   # why this asset is included
    constraints:
      - minimum 2 assets
      - must include at least one lead asset (the asset expected to move first)
      - must include at least one follower asset (the asset expected to lag)

  market_scope:
    exchanges:    list[string]   # e.g. ["Binance", "Coinbase"]
    quote_currency: string       # e.g. "USDT"
    data_resolution: list[string] # e.g. ["1d", "1h"]

  time_window:
    history_years: integer       # standard: 10
    start_date:    date          # computed: today minus history_years
    end_date:      date          # computed: today

  state_map_draft:
    type: list[object]
    each_item:
      state_name:       string   # e.g. "DORMANT", "IGNITION"
      description:      string   # plain English description
      expected_assets:  list[string]  # what the portfolio holds in this state
    constraints:
      - minimum 3 states
      - must include at least one RISK_OFF state (cash or near-cash)
      - must include at least one RISK_ON state (deployed capital)

  success_criteria:
    min_cagr_oos:          float   # e.g. 0.30 (= 30%)
    min_sharpe_oos:        float   # e.g. 1.5
    max_drawdown_oos:      float   # e.g. 0.30 (= 30% max drawdown)
    min_calmar_oos:        float   # e.g. 1.0
    min_oos_is_cagr_ratio: float   # e.g. 0.6 (OOS must be ≥ 60% of IS performance)
```

### GATE_01

```
ALL of the following must evaluate to TRUE:

  [G01-A] hypothesis.length == 1 sentence
  [G01-B] hypothesis contains reference to time (days, lag, delay, before, after)
  [G01-C] asset_universe.length >= 2
  [G01-D] asset_universe contains >= 1 item where role == "lead"
  [G01-E] asset_universe contains >= 1 item where role == "follower"
  [G01-F] state_map_draft.length >= 3
  [G01-G] state_map_draft contains >= 1 state where allocation == "CASH"
  [G01-H] all success_criteria fields are numeric and non-null

RESULT:
  ALL TRUE  → PROCEED to STEP_02
  ANY FALSE → HALT. Output which conditions failed. Do not proceed.
```

---

## STEP_02 — DATA_GATHERING_AND_REPORT

### PURPOSE
```
Collect 10 years of historical market data for all assets in asset_universe.
Compute all standard indicators.
Generate an objective analytics report — no strategy logic is applied here.
The report must be generated from raw data with zero forward-looking bias.
```

### REQUIRED_DATA_INPUTS

```yaml
price_data:
  type: OHLCV
  resolution: ["1d", "1h"]
  assets: [all items in target_spec.asset_universe]
  window: [target_spec.time_window.start_date → target_spec.time_window.end_date]
  source_priority: ["exchange_api", "aggregator_api", "csv_backup"]
  max_gap_allowed_days: 7  # gaps larger than this trigger a data quality failure

volume_data:
  type: ["spot_volume", "derivatives_volume"]
  resolution: "1d"
  assets: [all items in target_spec.asset_universe]

sentiment_data:
  fear_and_greed_index:
    resolution: "1d"
    source: "alternative.me or equivalent"
    window: [same as price_data]

macro_data:
  symbols: ["VIX", "DXY", "BTC_DOMINANCE"]
  resolution: "1d"
```

### REQUIRED_COMPUTED_INDICATORS

```yaml
per_asset_indicators:
  # All computed on daily close price unless stated otherwise
  - name: SMA_20
    formula: simple_moving_average(close, window=20)
  - name: SMA_50
    formula: simple_moving_average(close, window=50)
  - name: SMA_200
    formula: simple_moving_average(close, window=200)
  - name: RSI_14
    formula: relative_strength_index(close, window=14)
  - name: MACD
    formula: macd(close, fast=12, slow=26, signal=9)
    outputs: [macd_line, signal_line, histogram]
  - name: BOLLINGER_BANDS
    formula: bollinger(close, window=20, std_dev=2)
    outputs: [upper, middle, lower]
  - name: ATR_14
    formula: average_true_range(high, low, close, window=14)

temporal_lag_indicators:
  # Computed for every asset_pair in the universe
  # For each pair (lead_asset, follower_asset):
  - name: CROSS_CORRELATION
    method: pearson_cross_correlation
    lags: [1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30]  # days
    output: correlation_coefficient per lag per pair

correlation_matrix:
  - rolling_window_30d: correlation matrix across all assets, rolling 30-day
  - rolling_window_90d: correlation matrix across all assets, rolling 90-day
```

### REQUIRED_REPORT_SECTIONS

```
The analytics_report must contain ALL of the following sections, in this order:

SECTION_01: EXECUTIVE_SUMMARY
  - Per asset: CAGR, max_drawdown, annualised_volatility, sharpe_ratio (vs cash)
  - Output format: table

SECTION_02: PRICE_HISTORY
  - Log-scale price chart per asset, full time window
  - Overlay: SMA_20, SMA_200
  - Annotate: major bull market peaks, major crash troughs

SECTION_03: MOMENTUM_SNAPSHOTS
  - RSI distribution histogram per asset
  - SMA relationship frequency table: % of days price > SMA_20 / SMA_50 / SMA_200

SECTION_04: SENTIMENT_TIMELINE
  - Fear & Greed Index plotted over full time window
  - Annotate: F&G < 20 periods (extreme fear), F&G > 80 periods (extreme greed)
  - Overlay: BTC price for reference

SECTION_05: CORRELATION_ANALYSIS
  - Rolling 30-day correlation heatmap (animated or snapshots at bull/bear peaks)
  - Identify: periods of correlation breakdown (lead/follower decoupling)

SECTION_06: TEMPORAL_LAG_ANALYSIS  # CRITICAL SECTION
  - For every (lead, follower) asset pair:
      cross_correlation_table:
        columns: [lag_days, pearson_r, p_value, significant (p < 0.05)]
        rows: lags 1–30
  - Identify: lag(s) with highest |pearson_r| that are also statistically significant
  - Output: peak_lag per pair with confidence classification:
      HIGH:   |r| >= 0.6 AND p < 0.01
      MEDIUM: |r| >= 0.4 AND p < 0.05
      LOW:    |r| >= 0.2 AND p < 0.10
      NONE:   does not meet LOW threshold

SECTION_07: DRAWDOWN_ANALYSIS
  - Top 10 drawdown events per asset: [start_date, end_date, depth_pct, duration_days, recovery_days]
  - Identify: concurrent drawdowns across all assets (systemic risk events)

SECTION_08: RAW_DATA_EXPORT
  - Format: CSV or Parquet
  - Contents: all OHLCV, all computed indicators, sentiment, macro, correlation matrices
  - Naming: {asset}_{indicator}_{start}_{end}.csv
```

### GATE_02

```
ALL of the following must evaluate to TRUE:

  [G02-A] price_data covers full time_window with no gaps > 7 days for any asset
  [G02-B] all indicators listed in REQUIRED_COMPUTED_INDICATORS are present and non-null
  [G02-C] SECTION_06 (TEMPORAL_LAG_ANALYSIS) is complete for all asset pairs
  [G02-D] at least one (lead, follower) pair has peak_lag with confidence >= MEDIUM
           i.e. |pearson_r| >= 0.4 AND p < 0.05 at some lag between 1–30 days
  [G02-E] spot-check validation: sample 10 random (date, asset, indicator) tuples
           and verify values are arithmetically correct
  [G02-F] analytics_report PDF or structured export is fully generated

RESULT:
  ALL TRUE  → PROCEED to STEP_03
  G02-A FAIL → fix data gaps → retry data fetch → retry GATE_02
  G02-D FAIL → the temporal hypothesis may be unsupported by data
              → HALT and return to STEP_01 to revise hypothesis
  ANY OTHER FAIL → fix specific failure → retry STEP_02
```

---

## STEP_03 — STATE_AND_PATTERN_ANALYSIS

### PURPOSE
```
Transform the analytics_report into a formal state_map and temporal_delay_profile.
This step is analytical, not generative. You are reading patterns FROM the data,
not imposing patterns ONTO the data.
All states must be grounded in observed historical behaviour.
```

### CYCLE_IDENTIFICATION_PROTOCOL

```
A "full market cycle" is defined as:
  - A period containing at minimum: one bull phase AND one bear phase
  - Bull phase: asset price rises >= 50% from local minimum over >= 30 days
  - Bear phase: asset price falls >= 30% from local maximum over >= 30 days

For each full cycle identified:
  record:
    cycle_id:         integer (sequential)
    start_date:       date (local minimum before bull phase)
    bull_peak_date:   date (local maximum)
    end_date:         date (recovery of next local minimum)
    lead_asset:       string (asset that peaked first)
    follower_assets:  list[string] (assets that followed)

MINIMUM REQUIREMENT: >= 3 full cycles must be identified to proceed.
```

### TEMPORAL_DELAY_MEASUREMENT_PROTOCOL

```
For each full cycle AND each (lead, follower) pair:

  STEP A: Identify lead_breakout_date
    Definition: first day where lead_asset.close > lead_asset.SMA_20
                AND this condition was NOT true in the prior 20 days (fresh crossover)

  STEP B: Identify follower_breakout_date
    Definition: first day where follower_asset.close > follower_asset.SMA_20
                AND this condition was NOT true in the prior 20 days

  STEP C: Compute observed_lag
    observed_lag = follower_breakout_date - lead_breakout_date (integer, days)

  STEP D: Record per cycle

After all cycles:
  STEP E: Compute statistics per (lead, follower) pair:
    mean_lag:    mean(all observed_lag values)
    median_lag:  median(all observed_lag values)
    std_lag:     standard_deviation(all observed_lag values)
    n:           count(observations)
    confidence:  HIGH if n >= 5 AND std_lag < 0.5 * mean_lag
                 MEDIUM if n >= 3 AND std_lag < mean_lag
                 LOW if n >= 2
                 INSUFFICIENT if n < 2
```

### TEMPORAL_DELAY_PROFILE_SCHEMA

```yaml
temporal_delay_profile:
  generated_from: analytics_report
  cycles_analysed: integer
  pairs:
    - lead_asset:   string
      follower_asset: string
      mean_lag:     float   # days
      median_lag:   float   # days
      std_lag:      float   # days
      n:            integer # number of cycle observations
      confidence:   enum [HIGH, MEDIUM, LOW, INSUFFICIENT]
      use_in_strategy: bool  # true if confidence >= MEDIUM
```

### STATE_MAP_FORMALISATION

```
For each state in the state_map:

REQUIRED_FIELDS per state:
  state_id:       string        # unique identifier e.g. "DORMANT"
  state_type:     enum          # RISK_OFF | TRANSITION | RISK_ON | EMERGENCY
  entry_condition: expression   # formal boolean expression (see CONDITION_SYNTAX below)
  exit_condition:  expression   # formal boolean expression
  portfolio:      object        # see PORTFOLIO_SCHEMA below
  max_duration:   object        # optional: {value: int, unit: "days"} — alert if exceeded
  notes:          string        # any contextual observations from the data analysis

CONDITION_SYNTAX:
  All conditions use the following operators and functions:
    AND, OR, NOT
    >  <  >=  <=  ==  !=
    indicator(asset, name)         e.g. indicator("BTC", "SMA_20")
    price(asset)                   e.g. price("BTC")
    fear_greed()                   returns current Fear & Greed Index value (0–100)
    was_above(asset, indicator, N) returns bool: was price(asset) > indicator(asset) N days ago
    pct_change(asset, N)           returns float: N-day percentage price change
    vix()                          returns current VIX value
    btc_dominance()                returns current BTC dominance percentage

PORTFOLIO_SCHEMA per state:
  allocations:
    - asset:      string   # or "CASH" / "USDC"
      weight:     float    # 0.0 to 1.0
  constraints:
    - sum(weights) == 1.0
    - all weights >= 0.0
```

### EXAMPLE_STATE_MAP_ENTRY

```yaml
# This is an EXAMPLE. Your actual states are derived from YOUR data analysis.
# Do not copy this verbatim. Use it as a schema reference only.

- state_id: IGNITION
  state_type: RISK_ON
  entry_condition: >
    fear_greed() >= 30
    AND fear_greed() <= 75
    AND price("BTC") > indicator("BTC", "SMA_20")
    AND pct_change("BTC", 7) > 0.05
  exit_condition: >
    fear_greed() < 15
    OR was_above("BTC", "SMA_20", 3) == TRUE
  portfolio:
    allocations:
      - asset: "BTC"
        weight: 1.0
  notes: "Observed in 2017, 2021 cycles. Median duration 45 days. BTC leads before alts activate."
```

### GATE_03

```
ALL of the following must evaluate to TRUE:

  [G03-A] cycles_analysed >= 3
  [G03-B] temporal_delay_profile contains >= 1 pair where use_in_strategy == true
           (i.e. confidence >= MEDIUM)
  [G03-C] state_map contains >= 3 states
  [G03-D] state_map contains >= 1 state where state_type == RISK_OFF
  [G03-E] state_map contains >= 1 state where state_type == EMERGENCY
  [G03-F] every state has a non-null entry_condition AND exit_condition
  [G03-G] every state has a portfolio where sum(weights) == 1.0
  [G03-H] no state entry_condition is identical to another state entry_condition
  [G03-I] state_map_draft from STEP_01 has been revised to reflect actual data findings
           (document any states that were removed or added vs the draft)

RESULT:
  ALL TRUE  → PROCEED to STEP_04
  G03-A FAIL → data window is insufficient → return to STEP_02, extend time window
  G03-B FAIL → temporal hypothesis not supported → return to STEP_01, revise hypothesis
  ANY OTHER FAIL → fix state_map → retry GATE_03
```

---

## STEP_04 — STRATEGY_GENERATION

### PURPOSE
```
Translate the state_map and temporal_delay_profile into fully executable code.
The strategy must be 100% deterministic: identical inputs always produce identical outputs.
No manual overrides. No heuristics. No ambiguity.
```

### REQUIRED_CODEBASE_STRUCTURE

```
strategy/
  config.py           # ALL parameters — zero hard-coded values elsewhere
  state_machine.py    # Core: state evaluation, transition logic, transition logging
  signals.py          # All indicator computations + temporal lag signals
  portfolio.py        # Allocation calculation and rebalancing logic
  risk.py             # Position sizing, drawdown tracking, emergency exit
  execution.py        # Order generation (paper trading or live API)
  logger.py           # Structured logging for all state transitions and trades
  main.py             # Entry point: run once per day on candle close
  tests/
    test_signals.py   # Unit tests for all signal functions
    test_state_machine.py  # Unit tests for all state transitions
    test_portfolio.py # Unit tests for allocation and rebalancing
```

### CONFIG_SCHEMA

```python
# config.py — ALL values must be defined here. No value may appear in any other file.

# ── Asset Universe ─────────────────────────────────────────────────────────────
ASSET_UNIVERSE: list[str]       = [RESOLVED_FROM: target_spec.asset_universe]
LEAD_ASSET:     str             = [RESOLVED_FROM: temporal_delay_profile, highest confidence lead]
QUOTE_CURRENCY: str             = [RESOLVED_FROM: target_spec.market_scope.quote_currency]

# ── Indicator Parameters ───────────────────────────────────────────────────────
SMA_SHORT:   int = 20
SMA_LONG:    int = 200
RSI_WINDOW:  int = 14

# ── Temporal Lag Parameters ────────────────────────────────────────────────────
# One entry per pair in temporal_delay_profile where use_in_strategy == true
# Name format: LAG_{LEAD}_{FOLLOWER}_DAYS
# Value: use median_lag from temporal_delay_profile (round to nearest integer)
LAG_[LEAD]_[FOLLOWER]_DAYS: int = [RESOLVED_FROM: temporal_delay_profile.median_lag]

# ── Fear & Greed Thresholds ────────────────────────────────────────────────────
# One threshold per state transition — values resolved from STEP_03 state_map
FG_THRESHOLD_[STATE_NAME]_ENTRY: int = [RESOLVED_FROM: state_map.entry_condition]
FG_THRESHOLD_[STATE_NAME]_EXIT:  int = [RESOLVED_FROM: state_map.exit_condition]

# ── Portfolio Allocations per State ───────────────────────────────────────────
# One dict per state — must match state_map.portfolio exactly
ALLOCATION_[STATE_NAME]: dict[str, float] = [RESOLVED_FROM: state_map.portfolio.allocations]

# ── Risk Parameters ───────────────────────────────────────────────────────────
MAX_DRAWDOWN_PCT:          float = 0.30   # circuit breaker: force EMERGENCY state
EMERGENCY_EXIT_DROP_PCT:   float = 0.20   # single-day drop triggering EMERGENCY
MAX_SINGLE_ASSET_WEIGHT:   float = 1.0    # per asset cap (set lower to enforce diversification)
REBALANCE_THRESHOLD_PCT:   float = 0.05   # rebalance if weight drifts > 5% from target

# ── Execution Parameters ──────────────────────────────────────────────────────
MODE:          str = "PAPER"  # "PAPER" or "LIVE"
TRADE_FREQ:    str = "DAILY"  # execute once per day on candle close
SLIPPAGE_BPS:  int = 10       # assumed slippage in basis points (for backtesting)
FEE_BPS:       int = 10       # assumed trading fee in basis points (for backtesting)
```

### STATE_MACHINE_LOGIC

```python
# state_machine.py — pseudo-code specification

class StateMachine:

  def __init__(self, config):
    self.current_state = "DORMANT"  # always start in most conservative state
    self.state_entry_date = None
    self.config = config

  def evaluate(self, market_data: MarketData) -> tuple[str, str]:
    """
    Called once per day with fresh market data.
    Returns: (new_state, transition_reason)
    """

    # RULE: EMERGENCY always takes priority — check first
    if self._emergency_triggered(market_data):
      return "EMERGENCY", "emergency_condition_met"

    # RULE: Evaluate all state entry conditions in priority order
    # Priority order is defined in state_map (lower index = higher priority)
    for state in self.config.STATE_MAP_PRIORITY_ORDER:
      if self._entry_condition_met(state, market_data):
        if state != self.current_state:
          return state, f"entry_condition_{state}_met"
        else:
          return self.current_state, "no_change"

    # If no new state entry condition is met, remain in current state
    # UNLESS current state exit condition is met — then drop to prior state
    if self._exit_condition_met(self.current_state, market_data):
      prior_state = self._get_prior_state(self.current_state)
      return prior_state, f"exit_condition_{self.current_state}_met"

    return self.current_state, "no_change"

  def _emergency_triggered(self, data) -> bool:
    """Returns True if any emergency condition is met."""
    return (
      data.fear_greed < self.config.FG_THRESHOLD_EMERGENCY_ENTRY
      OR data.vix > self.config.VIX_SPIKE_THRESHOLD
      OR data.pct_change("BTC", 1) < -self.config.EMERGENCY_EXIT_DROP_PCT
    )

  def log_transition(self, from_state, to_state, reason, portfolio_value, timestamp):
    """Every transition must be logged — no exceptions."""
    Logger.write({
      "event":           "STATE_TRANSITION",
      "timestamp":       timestamp,
      "from_state":      from_state,
      "to_state":        to_state,
      "reason":          reason,
      "portfolio_value": portfolio_value,
      "market_snapshot": self._capture_snapshot()
    })
```

### TEMPORAL_SIGNAL_SPECIFICATION

```python
# signals.py — formal specification for all temporal lag signals

def was_above_sma(asset: str, n_days_ago: int, data: DataFrame) -> bool:
  """
  Returns True if price(asset) was > SMA_20(asset) exactly n_days_ago.
  Uses historical data only — no forward-looking bias.

  Parameters:
    asset:       ticker string e.g. "BTC"
    n_days_ago:  integer, days to look back
    data:        DataFrame with columns [date, asset, close, SMA_20]

  Returns:
    bool: True if historical price > SMA_20 at the n_days_ago offset

  Example:
    was_above_sma("BTC", 3, data)
    → True if BTC closed above its 20-day SMA three calendar days ago
  """
  target_date = today - timedelta(days=n_days_ago)
  row = data[(data.date == target_date) & (data.asset == asset)]
  if row.empty:
    return False  # missing data = False, conservative default
  return row.close.values[0] > row.SMA_20.values[0]

# Generate one function per lag per pair in temporal_delay_profile:
# Function name format: signal_{LEAD}_{FOLLOWER}_lag()
# Return type: bool
# Logic: calls was_above_sma(LEAD, LAG_{LEAD}_{FOLLOWER}_DAYS, data)
```

### LOGGING_SCHEMA

```yaml
# Every log entry must conform to this schema — no free-text logs

state_transition_log_entry:
  event:           "STATE_TRANSITION"
  timestamp:       ISO8601 datetime
  from_state:      string
  to_state:        string
  reason:          string   # which specific condition triggered the transition
  portfolio_value: float    # total USD value at moment of transition
  fear_greed:      integer  # F&G reading at moment of transition
  btc_price:       float
  active_signals:  list[string]  # all signal names that evaluated to True

trade_log_entry:
  event:           "TRADE"
  timestamp:       ISO8601 datetime
  state:           string   # state at time of trade
  asset:           string
  direction:       enum [BUY, SELL]
  quantity:        float
  price:           float
  fee_usd:         float
  portfolio_value_before: float
  portfolio_value_after:  float
```

### GATE_04

```
ALL of the following must evaluate to TRUE:

  [G04-A] strategy runs end-to-end on full 10-year dataset without runtime errors
  [G04-B] zero hard-coded numeric values in any file except config.py
           (automated check: grep for numeric literals outside config.py)
  [G04-C] all state transitions in the 10-year run are present in the state_transition_log
  [G04-D] sum of portfolio weights == 1.0 at all times in the simulation
  [G04-E] EMERGENCY state is triggered at least once during the 10-year run
           (validates that emergency logic is reachable)
  [G04-F] all unit tests in tests/ pass (100% pass rate required)
  [G04-G] trade_log contains >= 10 trades across the 10-year simulation

RESULT:
  ALL TRUE  → PROCEED to STEP_05
  ANY FAIL  → fix the specific failure → retry GATE_04
```

---

## STEP_05 — BACKTEST_REFINEMENT_AND_SIGNOFF

### PURPOSE
```
Validate the strategy against historical data using proper out-of-sample methodology.
Refine parameters if performance is insufficient.
Produce a final metrics_card if performance meets all success_criteria.
Deploy only if metrics_card shows APPROVED status.
```

### BACKTEST_PROTOCOL

```yaml
test_phases:

  IN_SAMPLE:
    window:  "years 1–7 of dataset"
    purpose: "parameter fitting and strategy calibration"
    note:    "You MAY adjust parameters based on IS results"

  OUT_OF_SAMPLE:
    window:  "years 8–10 of dataset"
    purpose: "unbiased validation — simulate real deployment"
    note:    "You may NOT adjust any parameter based on OOS results"
             "OOS results are read-only — they are the final verdict"

  WALK_FORWARD:
    method:  "rolling 1-year windows across full dataset"
    purpose: "test stability across different market regimes"
    output:  "per-window Sharpe ratio — plot for consistency"

  STRESS_TEST:
    windows:  "isolate and test on major crash periods only"
    purpose:  "validate EMERGENCY state and drawdown controls"
    examples: ["2018 crypto bear", "2020 COVID crash", "2022 crypto bear"]
    pass_condition: "max_drawdown during crash period < max_drawdown_oos threshold"
```

### BACKTEST_ASSUMPTIONS

```python
# These assumptions must be applied identically in all backtest phases:

slippage_bps:  RESOLVED_FROM config.SLIPPAGE_BPS   # default: 10 bps per trade
fee_bps:       RESOLVED_FROM config.FEE_BPS         # default: 10 bps per trade
rebalance:     "execute at next-day open after signal fires (no lookahead)"
data_source:   "same dataset as STEP_02 — no new data fetching during backtesting"
initial_capital: 10000  # USD, arbitrary — results are expressed as ratios/percentages
```

### REQUIRED_METRICS

```yaml
# Compute ALL of the following for BOTH in_sample AND out_of_sample windows

metrics:
  cagr:
    formula: "(ending_value / starting_value) ^ (1 / years) - 1"
    type: float
    unit: percentage

  sharpe_ratio:
    formula: "(mean_daily_return - risk_free_daily_rate) / std_daily_return * sqrt(252)"
    risk_free_rate: 0.05  # 5% annual, conservative assumption
    type: float

  max_drawdown:
    formula: "max((peak_value - trough_value) / peak_value) over all rolling windows"
    type: float
    unit: percentage (positive number, e.g. 0.25 = 25% drawdown)

  calmar_ratio:
    formula: "cagr / max_drawdown"
    type: float

  win_rate:
    definition: "percentage of state cycles where portfolio value at cycle end > cycle start"
    type: float
    unit: percentage

  oos_is_degradation_ratio:
    formula: "cagr_oos / cagr_is"
    type: float
    interpretation: "1.0 = no degradation; < 0.6 = likely overfitting"

  total_trades:
    definition: "count of all BUY and SELL executions in the test window"
    type: integer
    minimum_for_significance: 30

  avg_hold_period:
    definition: "mean duration in days between entering and exiting a RISK_ON state"
    type: float
    unit: days

  benchmark_comparison:
    benchmark: "buy-and-hold LEAD_ASSET (no trading)"
    metrics_to_compare: [cagr, sharpe_ratio, max_drawdown, calmar_ratio]
    required_result: "strategy must outperform benchmark on sharpe_ratio AND calmar_ratio"
```

### SUCCESS_CRITERIA_EVALUATION

```python
# Compare computed metrics against target_spec.success_criteria

def evaluate_success(metrics_oos, success_criteria) -> tuple[bool, list[str]]:
  failures = []

  if metrics_oos.cagr < success_criteria.min_cagr_oos:
    failures.append(f"CAGR {metrics_oos.cagr:.2%} < required {success_criteria.min_cagr_oos:.2%}")

  if metrics_oos.sharpe_ratio < success_criteria.min_sharpe_oos:
    failures.append(f"Sharpe {metrics_oos.sharpe_ratio:.2f} < required {success_criteria.min_sharpe_oos:.2f}")

  if metrics_oos.max_drawdown > success_criteria.max_drawdown_oos:
    failures.append(f"MaxDD {metrics_oos.max_drawdown:.2%} > allowed {success_criteria.max_drawdown_oos:.2%}")

  if metrics_oos.calmar_ratio < success_criteria.min_calmar_oos:
    failures.append(f"Calmar {metrics_oos.calmar_ratio:.2f} < required {success_criteria.min_calmar_oos:.2f}")

  if metrics_oos.oos_is_degradation_ratio < success_criteria.min_oos_is_cagr_ratio:
    failures.append(f"OOS/IS ratio {metrics_oos.oos_is_degradation_ratio:.2f} < required {success_criteria.min_oos_is_cagr_ratio:.2f}")

  passed = len(failures) == 0
  return passed, failures
```

### REFINEMENT_PROTOCOL

```
TRIGGER: evaluate_success() returns passed == False

PROCESS (execute in this order):

  CYCLE_LIMIT: maximum 5 refinement cycles. If still failing after 5 → ROLLBACK.

  STEP_R1: Identify underperforming states
    → Review state_transition_log
    → Compute per-state contribution to total return
    → List states with negative contribution across >= 2 market cycles

  STEP_R2: Adjust thresholds — IS data only
    → Adjust F&G thresholds, lag days, or allocation weights in config.py
    → Constraint: only modify values that affect states identified in STEP_R1
    → Constraint: all changes must be recorded with reason and expected effect
    → Constraint: DO NOT look at OOS data while adjusting — it must remain unseen

  STEP_R3: Sensitivity analysis
    → For each modified parameter: vary ±20% from new value
    → Re-run IS backtest for each variant
    → If metric improves monotonically with parameter change → parameter likely mis-set
    → If metric is insensitive to ±20% change → parameter is robust (good)

  STEP_R4: State elimination (if necessary)
    → If a state contributes negatively across all parameter variants:
       remove the state from the state_machine
       document: state_id, reason for removal, performance impact
    → CONSTRAINT: you may not eliminate more than 2 states per refinement cycle
    → CONSTRAINT: you may never eliminate the EMERGENCY state

  STEP_R5: Re-run full backtest
    → Re-run IS and OOS with revised config
    → Re-evaluate success criteria
    → Increment refinement_cycle_count

ROLLBACK_CONDITIONS (immediately halt refinement and rollback):
  - After 5 refinement cycles: evaluate_success() still returns False
  - OOS sharpe_ratio < 1.0 after 3 refinement cycles (no meaningful progress)
  - temporal_delay_profile.pairs used in strategy all have confidence < MEDIUM in OOS
  - More than 3 states were eliminated (strategy no longer resembles the original hypothesis)

ROLLBACK_TARGET: STEP_03
  → Return to STEP_03 with a note: "hypothesis requires revision"
  → Document all findings from the failed backtest cycle
  → Do not discard the data — it informs the revised hypothesis
```

### METRICS_CARD_SCHEMA

```yaml
# Produced on successful completion of STEP_05
# This is the final, signed-off record of the validated strategy

metrics_card:
  # ── Identity ───────────────────────────────────────────────────────────────
  strategy_name:        string
  version:              string   # e.g. "1.0"
  date_validated:       date
  data_window:          string   # e.g. "2015-01-01 to 2025-01-01"
  asset_universe:       list[str]

  # ── Architecture ──────────────────────────────────────────────────────────
  states:               list[str]   # state_ids used in final strategy
  temporal_lags_used:   list[object]
    # each: {lead, follower, lag_days, confidence}
  total_parameters:     integer    # count of entries in config.py
  refinement_cycles:    integer    # how many refinement cycles were needed

  # ── In-Sample Performance ─────────────────────────────────────────────────
  is_cagr:              float
  is_sharpe:            float
  is_max_drawdown:      float
  is_calmar:            float
  is_total_trades:      integer

  # ── Out-of-Sample Performance ─────────────────────────────────────────────
  oos_cagr:             float
  oos_sharpe:           float
  oos_max_drawdown:     float
  oos_calmar:           float
  oos_total_trades:     integer
  oos_is_ratio:         float    # oos_cagr / is_cagr

  # ── Benchmark Comparison (OOS) ────────────────────────────────────────────
  benchmark_cagr:       float
  benchmark_sharpe:     float
  benchmark_max_drawdown: float
  outperforms_benchmark: bool

  # ── Sign-Off ──────────────────────────────────────────────────────────────
  deploy_status:        enum [APPROVED, NOT_APPROVED]
  approval_reason:      string   # which criteria passed/failed
  code_version_tag:     string   # git tag or commit hash
```

### GATE_05

```
ALL of the following must evaluate to TRUE for deploy_status = APPROVED:

  [G05-A]  oos_cagr          >= success_criteria.min_cagr_oos
  [G05-B]  oos_sharpe        >= success_criteria.min_sharpe_oos
  [G05-C]  oos_max_drawdown  <= success_criteria.max_drawdown_oos
  [G05-D]  oos_calmar        >= success_criteria.min_calmar_oos
  [G05-E]  oos_is_ratio      >= success_criteria.min_oos_is_cagr_ratio
  [G05-F]  oos_total_trades  >= 30
  [G05-G]  outperforms_benchmark == True (on sharpe AND calmar)
  [G05-H]  metrics_card is fully populated — no null fields
  [G05-I]  code_version_tag is set (strategy is committed to version control)
  [G05-J]  all refinement changes are documented in the change log

RESULT:
  ALL TRUE  → deploy_status = APPROVED → strategy is cleared for deployment
  ANY FALSE → deploy_status = NOT_APPROVED
              if refinement_cycle_count < 5 → enter REFINEMENT_PROTOCOL
              if refinement_cycle_count >= 5 → ROLLBACK to STEP_03
```

---

## GLOBAL_CONSTRAINTS

```
These rules apply across ALL steps. Violations are treated as gate failures.

  [GC-01] NO FORWARD-LOOKING BIAS
           At no point may data from day T+N be used to make a decision on day T.
           This includes indicator computation, state transitions, and order execution.

  [GC-02] ALL PARAMETERS IN CONFIG
           No numeric constant may appear in strategy logic files.
           All thresholds, weights, and lag values live exclusively in config.py.

  [GC-03] NO MANUAL OVERRIDES
           The state machine runs autonomously. No human (or AI) manual intervention
           in trade decisions during backtesting or live operation.

  [GC-04] LOGGING IS MANDATORY
           Every state transition and every trade must produce a structured log entry.
           Silent failures are not acceptable.

  [GC-05] SEQUENTIAL STEP EXECUTION
           Steps are executed in order 01 → 05. No step may be skipped.
           No step may be partially executed.

  [GC-06] GATE BEFORE PROCEED
           Each step must pass its gate before the next step begins.
           Partial completion of a gate is treated as gate failure.

  [GC-07] ROLLBACK IS NOT FAILURE
           Returning to a prior step due to gate failure is part of the protocol.
           Document the rollback reason and carry forward all findings.

  [GC-08] HYPOTHESIS DRIVES EVERYTHING
           If at any point a finding contradicts the hypothesis, the hypothesis
           is the thing to revise — not the data and not the gate criteria.
```

---

## AI_AGENT_EXECUTION_INSTRUCTIONS

```
If you are an AI agent executing this pipeline, follow these instructions:

1. BEGIN by reading the full document before taking any action.

2. RESOLVE all [BRACKETED] variables before starting STEP_01.
   If you cannot resolve a variable, output a structured error and halt.

3. AT EACH STEP:
   a. State which step you are beginning.
   b. List all required outputs for the step.
   c. Execute the step.
   d. Evaluate the gate conditions one by one — output each as PASS or FAIL.
   e. If ALL pass: state "GATE_0N: PASS — proceeding to STEP_0N+1"
   f. If ANY fail: state "GATE_0N: FAIL — [list failed conditions] — [action]"

4. LOGGING: Every action that modifies state, generates data, or makes a decision
   must be logged in structured format (see LOGGING_SCHEMA in STEP_04).

5. AMBIGUITY HANDLING:
   If this document is ambiguous on a point:
   a. Choose the more conservative interpretation.
   b. Log the ambiguity and the choice made.
   c. Do not halt — proceed with the conservative interpretation.

6. ERROR HANDLING:
   If a runtime error occurs:
   a. Log the error with full context.
   b. Determine if the error is in data (→ retry data fetch) or logic (→ fix code).
   c. Do not proceed past the current step until the error is resolved.

7. COMPLETION:
   When GATE_05 passes, output the complete metrics_card and state:
   "PIPELINE COMPLETE — STRATEGY APPROVED FOR DEPLOYMENT"
   or
   "PIPELINE COMPLETE — STRATEGY NOT APPROVED — [reasons]"
```

---

## DOCUMENT_END
# CCE_FRAMEWORK_SPEC — VERSION 1.0
# All fields are typed. All gates are deterministic. All rollbacks are defined.
# This document is complete and self-contained.
