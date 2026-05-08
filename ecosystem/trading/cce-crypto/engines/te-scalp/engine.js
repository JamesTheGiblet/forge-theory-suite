// engines/te-scalp/engine.js
// T.E Scalp — High Frequency BTC RSI + Volume Scalper
// 5-minute cycles, small positions, fast exits
'use strict';

const TeScalpStrategy = require('./strategy');
const TeScalpStorage  = require('./storage');

const PREFIX = 'TE-SCP';
const STATE  = { IDLE:'IDLE', STALKING:'STALKING', ENTRY:'ENTRY', RIDING:'RIDING', EXIT:'EXIT', STOPPED:'STOPPED' };

class TeScalpEngine {

  constructor(config, notifier) {
    this.config   = config;
    this.notifier = notifier;
    const cfg = config.scalp || {};

    this.isRunning      = false;
    this.cycleCount     = 0;
    this.currentState   = STATE.IDLE;
    this.dryRun         = cfg.dryRun !== false;
    this.capital        = cfg.capitalUSDC || 100;
    this.portfolioValue = this.capital;
    this.totalPnl       = 0;
    this.dailyPnl       = 0;
    this.maxDailyLoss   = cfg.maxDailyLoss || 0.03;
    this.circuitBroken  = false;

    this.entryPrice     = null;
    this.entryRsi       = null;
    this.entryCandle    = 0;
    this.candlesHeld    = 0;
    this.cooldownCount  = 0;

    // Price/volume/RSI history for calculations
    this.closes         = [];
    this.volumes        = [];
    this.rsiHistory     = [];

    this.tradeCount     = 0;
    this.winCount       = 0;

    this.strategy = new TeScalpStrategy(cfg);
    this.storage  = new TeScalpStorage();

    this.lastCycleTime  = null;
    this.dailyResetTime = Date.now();
  }

  async start(intervalMinutes = 5) {
    this.isRunning = true;
    console.log('\n[' + PREFIX + '] Starting T.E Scalp Engine');
    console.log('[' + PREFIX + '] Mode: ' + (this.dryRun ? 'DRY RUN' : '⚠️  LIVE'));
    console.log('[' + PREFIX + '] Capital: $' + this.capital);
    console.log('[' + PREFIX + '] Strategy: RSI oversold + volume spike\n');
    while (this.isRunning) {
      await this.runCycle();
      if (!this.isRunning) break;
      await this._sleep(intervalMinutes * 60 * 1000);
    }
  }

  stop() { this.isRunning = false; this.storage.close(); }

  async runCycle() {
    this.cycleCount++;
    this.lastCycleTime = new Date().toISOString();

    try {
      this._checkDailyReset();
      if (this._circuitBreakerTripped()) return;

      const data = await this._fetchData();
      if (!data) return;

      // Update history
      this.closes.push(data.btcPrice);
      this.volumes.push(data.volume);
      if (this.closes.length > 50) this.closes.shift();
      if (this.volumes.length > 50) this.volumes.shift();

      // Calculate RSI
      const rsi = this._calcRSI(this.closes, 14);
      this.rsiHistory.push(rsi);
      if (this.rsiHistory.length > 20) this.rsiHistory.shift();

      // Update cooldown
      if (this.cooldownCount > 0) this.cooldownCount--;
      if (this.entryPrice) this.candlesHeld++;

      const signals = this._evaluateSignals(data, rsi);

      // Log every 12 cycles (1 hour) to avoid spam
      if (this.cycleCount % 12 === 0 || this.currentState !== STATE.IDLE) {
        console.log('[' + PREFIX + '] BTC: $' + data.btcPrice.toFixed(0) + ' | RSI: ' + rsi.toFixed(1) + ' | Vol: ' + signals.volumeMult.toFixed(2) + 'x | State: ' + this.currentState + (this.entryPrice ? ' | PnL: ' + signals.pnlPct.toFixed(2) + '%' : ''));
      }

      const next = this.strategy.evaluate(this.currentState, signals);
      if (next !== this.currentState) await this._transition(next, signals);

      await this._executeDecision(signals, data, rsi);

      this.storage.logCycle({
        timestamp:      this.lastCycleTime,
        cycle:          this.cycleCount,
        state:          this.currentState,
        btcPrice:       data.btcPrice,
        rsi,
        volumeMult:     signals.volumeMult,
        portfolioValue: this.portfolioValue,
        dailyPnl:       this.dailyPnl,
        signals:        JSON.stringify(signals)
      });

    } catch(err) {
      console.error('[' + PREFIX + '] ❌ Error:', err?.message || err);
      this.storage.logError({ timestamp: new Date().toISOString(), error: err?.message || String(err) });
    }
  }

  async _fetchData() {
    try {
      const data = await this._get('https://api.kraken.com/0/public/Ticker?pair=XBTUSDC');
      const r    = data?.result?.XBTUSDC || {};
      const btcPrice = parseFloat(r.c?.[0] || 0);
      const volume   = parseFloat(r.v?.[0] || 0); // today's volume
      if (!btcPrice) return null;
      return { btcPrice, volume };
    } catch(e) { return null; }
  }

  _get(url) {
    return new Promise((resolve, reject) => {
      require('https').get(url, { headers: { 'User-Agent': 'CCE/2.4' } }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      }).on('error', reject);
    });
  }

  _calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i-1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  _evaluateSignals(data, rsi) {
    const cfg = this.config.scalp || {};

    // Volume multiplier
    const avgVol = this.volumes.length >= 6
      ? this.volumes.slice(-12).reduce((a, v) => a + v, 0) / Math.min(this.volumes.length, 12)
      : data.volume;
    const volumeMult = avgVol > 0 ? data.volume / avgVol : 1;

    // Bullish divergence — price making lower low but RSI making higher low
    let bullishDivergence = false;
    if (this.closes.length >= 10 && this.rsiHistory.length >= 5) {
      const prevLowPrice = Math.min(...this.closes.slice(-10, -5));
      const currLowPrice = Math.min(...this.closes.slice(-5));
      const prevLowRsi   = Math.min(...this.rsiHistory.slice(-5, -2));
      const currLowRsi   = Math.min(...this.rsiHistory.slice(-2));
      bullishDivergence  = currLowPrice < prevLowPrice && currLowRsi > prevLowRsi;
    }

    const pnlPct = this.entryPrice
      ? ((data.btcPrice - this.entryPrice) / this.entryPrice * 100)
      : 0;

    return {
      btcPrice:         data.btcPrice,
      rsi,
      volumeMult,
      pnlPct,
      candlesHeld:      this.candlesHeld,
      cooldownDone:     this.cooldownCount === 0,
      volumeSpike:      volumeMult >= (cfg.volumeSpike || 1.5),
      bullishDivergence
    };
  }

  async _executeDecision(signals, data, rsi) {
    // Open position
    if (this.currentState === STATE.ENTRY && !this.entryPrice) {
      this.entryPrice   = data.btcPrice;
      this.entryRsi     = rsi;
      this.candlesHeld  = 0;
      this.entryCandle  = this.cycleCount;
      console.log('[' + PREFIX + '] ' + (this.dryRun ? 'DRY ' : '') + '⚡ SCALP BUY @ $' + data.btcPrice.toFixed(0) + ' | RSI: ' + rsi.toFixed(1) + ' | Vol: ' + signals.volumeMult.toFixed(2) + 'x');
      await this._transition(STATE.RIDING, signals);
    }

    // Close position
    if (this.currentState === STATE.EXIT && this.entryPrice) {
      const pnlPct     = ((data.btcPrice - this.entryPrice) / this.entryPrice * 100);
      const pnlUsd     = this.capital * (pnlPct / 100);
      const cfg        = this.config.scalp || {};

      let exitReason = 'TARGET';
      if (pnlPct <= (cfg.stopPct || -0.5))          exitReason = 'STOP';
      else if (rsi >= (cfg.rsiOverbought || 68))     exitReason = 'RSI_OB';
      else if (this.candlesHeld >= (cfg.maxHoldCandles || 6)) exitReason = 'TIMEOUT';

      this.portfolioValue += pnlUsd;
      this.dailyPnl       += pnlUsd;
      this.totalPnl       += pnlUsd;
      this.tradeCount++;
      if (pnlUsd > 0) this.winCount++;
      this.cooldownCount = cfg.cooldownCandles || 3;

      const winRate = this.tradeCount > 0 ? ((this.winCount / this.tradeCount) * 100).toFixed(0) : 0;
      const outcome = pnlUsd > 0 ? 'W' : 'L';
      console.log('[' + PREFIX + '] ' + outcome + ' | $' + this.entryPrice.toFixed(0) + '→$' + data.btcPrice.toFixed(0) + ' | ' + pnlPct.toFixed(2) + '% | ' + exitReason + ' | WR: ' + winRate + '% (' + this.tradeCount + ' trades)');

      this.storage.logTrade({
        timestamp:   this.lastCycleTime,
        entry_price: this.entryPrice,
        exit_price:  data.btcPrice,
        rsi_entry:   this.entryRsi,
        rsi_exit:    rsi,
        pnl_pct:     pnlPct,
        pnl_usd:     pnlUsd,
        candles_held: this.candlesHeld,
        exit_reason: exitReason,
        dry_run:     this.dryRun ? 1 : 0
      });

      this.entryPrice  = null;
      this.entryRsi    = null;
      this.candlesHeld = 0;
      await this._transition(STATE.IDLE, signals);
    }
  }

  getStatus() {
    const winRate = this.tradeCount > 0 ? ((this.winCount / this.tradeCount) * 100).toFixed(0) : 0;
    return {
      engine:         PREFIX,
      state:          this.currentState,
      cycle:          this.cycleCount,
      dryRun:         this.dryRun,
      capital:        this.capital,
      portfolioValue: this.portfolioValue,
      totalPnl:       this.totalPnl,
      dailyPnl:       this.dailyPnl,
      tradeCount:     this.tradeCount,
      winRate:        winRate + '%',
      entryPrice:     this.entryPrice,
      isRunning:      this.isRunning
    };
  }

  getState() { return this.currentState; }

  async _transition(newState, signals) {
    const from = this.currentState;
    this.currentState = newState;
    if (from !== newState) console.log('[' + PREFIX + '] ' + from + ' → ' + newState);
    this.storage.logTransition({ timestamp: new Date().toISOString(), from, to: newState, signals: JSON.stringify(signals) });
  }

  _circuitBreakerTripped() {
    if (this.circuitBroken) return true;
    if (this.dailyPnl < -(this.capital * this.maxDailyLoss)) {
      this.circuitBroken = true;
      this.currentState  = STATE.STOPPED;
      console.log('[' + PREFIX + '] ⛔ Circuit breaker');
      return true;
    }
    return false;
  }

  _checkDailyReset() {
    if ((Date.now() - this.dailyResetTime) >= 86400000) {
      this.dailyPnl = 0; this.circuitBroken = false; this.dailyResetTime = Date.now();
    }
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = TeScalpEngine;
