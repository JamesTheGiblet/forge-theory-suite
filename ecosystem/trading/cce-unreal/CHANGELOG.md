# Changelog

All notable changes to this project will be documented in this file.

## [2.2.0] - 2026-02-21

### 🔒 Proprietary IP & Strategy Refactor

* **Externalized Strategy:** Moved all hardcoded strategy logic (allocations, signal thresholds, sentiment weights) out of the core code and into `config.js`.
* **Proprietary Config:** Added support for `proprietary.config.js`. This file overrides default settings and is git-ignored, allowing you to keep your specific strategy parameters secret and separate from the codebase.
* **Dynamic Signals:** `TechnicalSignals` and `SentimentSignals` classes now accept configuration objects instead of using hardcoded values.

### 📦 Windows Build Improvements

* **Native Module Support:** Build script now automatically finds and copies the correct `sqlite3` binary (`node_sqlite3.node`) to the dist folder.
* **Auto-Zipping:** `npm run build-win` now automatically compresses the release into `cce-windows-release.zip`.
* **Robust Launchers:** Updated `start.bat` and added `reset-demo.bat` and `restore.bat` for better user experience.
* **restore.exe:** Drag-and-drop database restore tool compiled into Windows package. Validates SQLite header before restore, auto-backs up existing database before overwriting.

### 🛠️ Fixes

* **Licence Validation:** Added Gumroad API licence key check on startup. Engine refuses to start without a valid key. Network failures soft-pass to avoid disrupting live trading during Gumroad outages.
* **Package Entry:** Added `"bin": "index.js"` to `package.json` to fix `pkg` build errors.
* **Path Resolution:** Fixed database and log path resolution when running inside a packaged executable vs source.

## [2.1.0] - 2026-02-21

### 📚 Documentation Overhaul

A complete rewrite of all customer-facing documentation to focus on trust, safety, and plain English explanations.

* **New "How it Works" Explainer:** Replaced technical jargon with "Champagne Tower" and "Thermostat" analogies.
* **New Dry Run Guide:** Step-by-step instructions for the 30-day paper trading phase, including Licence Key setup.
* **New Emergency Stop Procedure:** Clear, phased guide for killing the bot and securing funds during a crisis.
* **New Troubleshooting Guide:** Dedicated support for the "Stuck in DORMANT" FAQ.
* **New Glossary of States:** Simple definitions for all 8 engine states.
* **New Email Sequences:**
  * "First 24 Hours" welcome email.
  * 4-part Nurture Sequence to keep users engaged during the dry run.

### ⚙️ Strategy Updates

* **Cascade 2 Reallocation:** Updated the `CASCADE_2` portfolio logic.
  * *Old:* High-risk small caps (RNDR, FET).
  * *New:* Balanced growth mix (60% BTC, 20% ETH, 20% SOL) to capture late-cycle liquidity without excessive volatility.

### 🐛 Fixes & Improvements

* Standardized log output formats in documentation to match real engine output (`✅ State: DORMANT`).
* Added Dashboard Emergency Stop instructions to safety guides.

## [2.3.0] - 2026-03-23

### ⚡ T.E LCE — Liquidation Cascade Engine

* **New Engine:** T.E LCE added to the CCE platform as the 4th Tactical Engine
* **Strategy:** Detects and rides liquidation cascades on 5-minute cycles across BTC, ETH, and SOL
* **Signal Stack:** Binance futures liquidation stream + OI delta + Kraken RSI/momentum confirmation
* **FSM:** 5-state machine — DORMANT → STALKING → TRIGGERED → RIDING → EXITING
* **Risk:** 0.8% stop loss, 1.6% take profit (2:1 R:R), trailing stop at 0.5% profit, 3% daily circuit breaker
* **Mode:** Dry run (paper trading) — $100 USDC allocated
* **Dashboard:** LCE card added to both index.html and Forge HQ
* **API:** `/api/lce/status` and `/api/lce/trades` endpoints added to dashboard-server.js

### 🏗️ Platform Additions (March 2026)

* **T.E Momentum** — 2H momentum engine across BTC/ETH/SOL (dry run)
* **T.E Breakout** — 1H Bollinger Band squeeze breakout engine (dry run)
* **S.E EGP** — USD/EGP regime classification engine, weekly cycle (CAUTION active)
* **S.E Commodities** — Multi-commodity cascade engine Oil→Gold→Copper (WATCHING)
* **O.E Sentinel** — Cross-engine anomaly detection, 15min cycle (ACTIVE)
* **O.E Observer** — Passive intelligence layer, 183+ observations logged
* **O.E Strategist** — Pattern analysis engine (enabled after 96 observations)
* **DXY Layer** — Dollar strength modifier feeding into COMO and crypto signals

### 📊 Dashboard

* Forge HQ PWA updated with all new engine widgets
* Main dashboard updated to 7 T.E/O.E engine cards
* Sentinel modal with live anomaly feed
* Real-time spark charts for BTC, F&G, SPY/VIX, OIL/GOLD

### 🔧 Infrastructure

* Platform migrated fully to Samsung S24 Ultra via Termux/PM2
* sql.js storage layer for Android compatibility across all engines
* Shared NotificationService across all engines
* Single PM2 process (cce-bot) orchestrating 11 engines in parallel

## [2.3.1] - 2026-03-23

### 🔧 Signal Fixes (Issue 1 of 5)

* **btc_5_percent_drop** — now calculated from real 24H OHLCV data (last 2 daily closes)
* **btc_d_rising_sharply** — rolling 30-cycle dominance history buffer added to engine, fires when dominance rises 1.5%+ above 3-cycle average
* **alt_season_index_above_75** — approximated as BTC dominance < 45% (alts outperforming proxy)
* **dominanceHistory** — rolling buffer initialised in CCEEngine constructor, populated every cycle
* getAllSignals() now accepts dominanceHistory as 4th parameter (default [])
* All 31 pre-flight tests passing

## [2.3.2] - 2026-03-23

### 🔧 Fee & Slippage Model (Issue 2 of 5)

* **CCERebalancer** now applies a cost model to all trade actions
* Fee rate: 0.16% (Kraken maker) — configurable via `config.trading.feeRate`
* Slippage estimate: 0.1% — configurable via `config.trading.slippageRate`
* Buy actions: gross value divided by (1 - costRate) to cover fees
* Sell actions: gross value multiplied by (1 - costRate) — receive less after fees
* Each action now includes `grossValue` and `estimatedCost` fields for audit trail
* All 31 pre-flight tests passing

## [2.3.3] - 2026-03-23

### 🔧 Confidence Layer (Issue 3 of 5)

* **CCEStateMachine** now returns confidence score (0-1) on every state transition
* **_calculateConfidence()** — scores active signals, sentiment, and negative indicators
* **_getSignalDrivers()** — returns list of signals that contributed to the transition
* Each transition object now includes `confidence` and `drivers` fields
* High confidence (>0.7): strong signal alignment
* Low confidence (<0.4): mixed or weak signals — useful for STR pattern analysis
* All 31 pre-flight tests passing

## [2.3.4] - 2026-03-23

### 🔧 STR Regime-Aware Pattern Matching (Issue 4 of 5)

* **_findSimilarConditions()** now filters by macro regime before pattern matching
* Sentiment regimes: EXTREME_FEAR / FEAR / NEUTRAL / GREED / EXTREME_GREED
* Volatility regimes: HIGH_VOL (VIX≥30) / MED_VOL (VIX≥20) / LOW_VOL
* Bull market patterns no longer contaminate bear market analysis
* F&G similarity window widened to ±10 within regime (was ±5 globally)
* All 31 pre-flight tests passing

## [2.3.5] - 2026-03-23

### 🔧 Grid & MOM Strategy Fixes

**Grid (grid-strategy.js)**
* Added slippage model to calcCycleProfit (0.1% per side, configurable)
* Added upside runaway protection to shouldStop — recentres if BTC rises 20%+ from centre
* New config params: slippageRate (0.001), runawayPct (0.20)

**MOM (mom-strategy.js)**
* Fixed trailing stop check order — now evaluated BEFORE stop loss and take profit
* Fixed trailing stop condition — was never activating due to inverted logic
* calcPositionSize now accounts for fees in cost calculation

**OBS (obs-strategy.js)**
* analyseMarketRegimes now populates activeEngines array per regime (was always empty)
* analyseEngineCorrelation active states updated — added STALKING, TRIGGERED, RIDING, SCANNING, STANDBY
* generateInsights now produces correlation insights for engine pairs active ≥20% simultaneously

## [2.3.6] - 2026-03-23

### 🔧 Forex, EGP & COMO Strategy Fixes

**Forex (forex-strategy.js)**
* calculateATR now uses Wilder smoothing instead of simple average — more accurate volatility estimate
* Position direction now derived from signal (isOversold=BUY, isOverbought=SELL) — no longer hardcoded
* Spread cost model added — BUY pays spread, SELL receives less (configurable via spreadPips, default 1.5)
* spreadPips added to constructor config

**EGP (egp-strategy.js)**
* checkDivergence thresholds now configurable — default lowered from -0.5/-0.5 to -0.25/+0.25
* Catches smaller CBE cuts during rising inflation (e.g. -0.25% cut with +0.3% CPI rise)
* Thresholds passable via inputs.divergenceRateThreshold / inputs.divergenceInflationThreshold

**COMO (como-strategy.js)**
* COMOSignals.getAllSignals now validates all inputs with safe defaults
* oilBearish computed explicitly in signals (was hidden dependency from data feed)
* goldFollowing now gated by correlation check — oilGoldCorr must be > 0.3
* corrConfirmed field added to signal output for transparency
* All 31 pre-flight tests passing

## [2.3.7] - 2026-03-23

### 🔧 CME & BRK Strategy Fixes

**CME (cme-strategy.js)**
* getDrawdownFromPeak now uses reduce instead of spread operator — prevents stack overflow on large arrays
* getAllSignals now validates all inputs with safe defaults
* vixElevated signal added (VIX 20-25) — was used in FSM but never defined in signals
* vixLow, vixHigh computed from validated vix value — no longer hidden data feed dependency
* sma50, sma200, price added to signal output for transparency

**BRK (brk-strategy.js)**
* detectSqueeze loop fixed — was iterating squeezeBars+1 times (off by one)
* calcPositionSize now accounts for fees — same fix as MOM engine
* All 31 pre-flight tests passing

## [2.3.8] - 2026-03-23

### 🔧 LCE Strategy Fixes

**LCE (cce-lce-engine.js)**
* Entry price now adjusted for fee + slippage (BUY pays more, SELL receives less)
* qty calculation uses fee-adjusted entry price
* _cascadeConfirmed now uses confidence scoring — requires ≥0.6 to trigger
* _cascadeConfidence() added — scores liq volume, OI drop, momentum, RSI on 0-1 scale
* Partial signals (e.g. high liq but low OI) now score 0.5 rather than hard fail
* All 31 pre-flight tests passing
