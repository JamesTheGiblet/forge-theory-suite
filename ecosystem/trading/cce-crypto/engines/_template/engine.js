// engines/_template/engine.js
// CCE Core Framework — Engine Template
// Copy this folder, rename it, update manifest.json, implement runCycle().
// Everything else is wired up.
//
// CHECKLIST:
//   [ ] Rename folder from _template to your engine id
//   [ ] Update manifest.json
//   [ ] Update PREFIX constant below
//   [ ] Update STATE enum with your states
//   [ ] Implement _fetchData()
//   [ ] Implement _evaluateSignals()
//   [ ] Implement _executeDecision()
//   [ ] Update getStatus() fields
//   [ ] Add your config block to config.js

'use strict';

const TemplateStrategy = require('./strategy');
const TemplateStorage  = require('./storage');

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const PREFIX = 'TMPL'; // Telegram prefix — update to match your engine id

const STATE = {
  DORMANT:  'DORMANT',   // Default — most conservative, capital preserved
  WATCHING: 'WATCHING',  // Conditions building — no capital deployed
  ACTIVE:   'ACTIVE',    // Conditions met — capital deployed
  EXITING:  'EXITING',   // Unwinding position
  STOPPED:  'STOPPED'    // Circuit breaker triggered
};

// ── ENGINE ────────────────────────────────────────────────────────────────────

class TemplateEngine {

  // ── CONSTRUCTOR ─────────────────────────────────────────────────────────────

  constructor(config, notifier, exchangeConnector = null) {
    this.config   = config;
    this.notifier = notifier;
    this.exchange = exchangeConnector;

    // Source all config from config object — no hardcoded values
    const cfg = config.template || {};

    // Core state
    this.isRunning    = false;
    this.cycleCount   = 0;
    this.currentState = STATE.DORMANT;
    this.prevState    = STATE.DORMANT;

    // Mode
    this.dryRun = cfg.dryRun !== false; // ALWAYS default to dry run

    // Capital
    this.capital      = cfg.capitalUSDC || 100;
    this.portfolioValue = this.capital;
    this.totalPnl     = 0;
    this.dailyPnl     = 0;
    this.dailyTrades  = 0;

    // Circuit breaker
    this.maxDailyLoss   = cfg.maxDailyLoss || 0.03; // 3% default
    this.circuitBroken  = false;

    // Strategy and storage
    this.strategy = new TemplateStrategy(cfg);
    this.storage  = new TemplateStorage();

    // Timestamps
    this.lastCycleTime    = null;
    this.lastTransition   = null;
    this.dailyResetTime   = Date.now();
  }

  // ── START ────────────────────────────────────────────────────────────────────

  async start(intervalMinutes = 5) {
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`\n[${PREFIX}] Starting ${this.config.template?.name || 'Template Engine'}`);
    console.log(`[${PREFIX}] ⏱️  Cycle: ${intervalMinutes} minutes`);
    console.log(`[${PREFIX}] 🔧 Mode: ${this.dryRun ? 'DRY RUN' : '⚠️  LIVE'}`);
    console.log(`[${PREFIX}] 💰 Capital: $${this.capital}\n`);

    while (this.isRunning) {
      await this.runCycle();
      if (!this.isRunning) break;
      console.log(`[${PREFIX}] ⏳ Next run: ${new Date(Date.now() + intervalMs).toLocaleTimeString()}`);
      await this._sleep(intervalMs);
    }
  }

  // ── STOP ─────────────────────────────────────────────────────────────────────

  stop() {
    console.log(`\n[${PREFIX}] 🛑 Stopping...`);
    this.isRunning = false;
    this.storage.close();
  }

  // ── RUN CYCLE ────────────────────────────────────────────────────────────────

  async runCycle() {
    this.cycleCount++;
    const start = Date.now();
    this.lastCycleTime = new Date().toISOString();

    console.log(`\n[${PREFIX}] ─── Cycle #${this.cycleCount} @ ${new Date().toLocaleTimeString()} ───`);

    try {
      // 1. Daily reset check
      this._checkDailyReset();

      // 2. Circuit breaker check
      if (this._circuitBreakerTripped()) {
        console.log(`[${PREFIX}] ⛔ Circuit breaker active — skipping cycle`);
        return;
      }

      // 3. Fetch market data
      const data = await this._fetchData();
      if (!data) {
        console.log(`[${PREFIX}] ⚠️  No data — skipping cycle`);
        return;
      }

      // 4. Evaluate signals
      const signals = this._evaluateSignals(data);
      console.log(`[${PREFIX}] 📊 State: ${this.currentState} | ${this._signalSummary(signals)}`);

      // 5. Determine next state
      const nextState = this.strategy.evaluate(this.currentState, signals, data);

      // 6. Handle state transition
      if (nextState !== this.currentState) {
        await this._transition(nextState, signals);
      }

      // 7. Execute decision for current state
      await this._executeDecision(signals, data);

      // 8. Log cycle
      this.storage.logCycle({
        timestamp:    this.lastCycleTime,
        cycle:        this.cycleCount,
        state:        this.currentState,
        portfolioValue: this.portfolioValue,
        dailyPnl:     this.dailyPnl,
        signals:      JSON.stringify(signals)
      });

      console.log(`[${PREFIX}] ✅ ${Date.now() - start}ms | PnL: ${this.dailyPnl.toFixed(4)} | Trades: ${this.dailyTrades}`);

    } catch (err) {
      console.error(`[${PREFIX}] ❌ Cycle error: ${err.message}`);
      this.storage.logError({ timestamp: new Date().toISOString(), error: err.message });
    }
  }

  // ── GET STATUS ───────────────────────────────────────────────────────────────
  // Called by dashboard API and O.E Observer

  getStatus() {
    return {
      engine:       PREFIX,
      state:        this.currentState,
      cycle:        this.cycleCount,
      dryRun:       this.dryRun,
      capital:      this.capital,
      portfolioValue: this.portfolioValue,
      totalPnl:     this.totalPnl,
      dailyPnl:     this.dailyPnl,
      dailyTrades:  this.dailyTrades,
      lastCycle:    this.lastCycleTime,
      isRunning:    this.isRunning,
      circuitBroken: this.circuitBroken
    };
  }

  // ── GET STATE ────────────────────────────────────────────────────────────────
  // Called by O.E Observer for cross-engine snapshots

  getState() {
    return this.currentState;
  }

  // ── IMPLEMENT THESE ──────────────────────────────────────────────────────────
  // These three methods are where your engine logic lives.

  async _fetchData() {
    // Fetch market data from exchange, APIs, or other sources.
    // Return a data object, or null if fetch fails.
    //
    // Example:
    // const price = await this.exchange.fetchTicker('BTC/USDC');
    // return { price: price.last, volume: price.baseVolume };
    //
    throw new Error('_fetchData() not implemented');
  }

  _evaluateSignals(data) {
    // Compute signals from market data.
    // Return a plain object of boolean/numeric signals.
    //
    // Example:
    // return {
    //   priceAboveSma: data.price > data.sma20,
    //   rsiOversold:   data.rsi < 30,
    //   volumeSpike:   data.volume > data.avgVolume * 1.5
    // };
    //
    throw new Error('_evaluateSignals() not implemented');
  }

  async _executeDecision(signals, data) {
    // Act on the current state.
    // Check this.dryRun before placing any real orders.
    //
    // Example:
    // if (this.currentState === STATE.ACTIVE) {
    //   if (this.dryRun) {
    //     console.log(`[${PREFIX}] DRY RUN — would buy here`);
    //     return;
    //   }
    //   await this.exchange.createOrder(...);
    // }
    //
    throw new Error('_executeDecision() not implemented');
  }

  // ── STATE MACHINE ────────────────────────────────────────────────────────────

  async _transition(newState, signals) {
    const from = this.currentState;
    this.prevState    = from;
    this.currentState = newState;
    this.lastTransition = new Date().toISOString();

    console.log(`[${PREFIX}] 🔄 ${from} → ${newState}`);

    // Log to storage
    this.storage.logTransition({
      timestamp: this.lastTransition,
      from,
      to:        newState,
      signals:   JSON.stringify(signals)
    });

    // Notify
    await this.notifier.send(
      `[${PREFIX}] State: ${from} → ${newState}`
    );
  }

  // ── CIRCUIT BREAKER ──────────────────────────────────────────────────────────

  _circuitBreakerTripped() {
    if (this.circuitBroken) return true;
    if (this.dailyPnl < -(this.capital * this.maxDailyLoss)) {
      this.circuitBroken = true;
      this.currentState  = STATE.STOPPED;
      console.log(`[${PREFIX}] ⛔ Circuit breaker tripped — daily loss limit hit`);
      this.notifier.send(`[${PREFIX}] ⛔ Circuit breaker tripped. Daily loss: ${this.dailyPnl.toFixed(4)}`);
      return true;
    }
    return false;
  }

  // ── DAILY RESET ──────────────────────────────────────────────────────────────

  _checkDailyReset() {
    const now = Date.now();
    const hoursSinceReset = (now - this.dailyResetTime) / (1000 * 60 * 60);
    if (hoursSinceReset >= 24) {
      this.dailyPnl      = 0;
      this.dailyTrades   = 0;
      this.circuitBroken = false;
      this.dailyResetTime = now;
      console.log(`[${PREFIX}] 🔄 Daily stats reset`);
    }
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────

  _signalSummary(signals) {
    return Object.entries(signals)
      .map(([k, v]) => `${k}:${typeof v === 'boolean' ? (v ? '✅' : '❌') : v}`)
      .join(' | ');
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

module.exports = TemplateEngine;
