// engines/se-pulse/engine.js
// S.E Pulse — BTC Mean Reversion Engine
// Buys significant intraday dips, exits on recovery or timeout
'use strict';

const SePulseStrategy = require('./strategy');
const SePulseStorage  = require('./storage');

const PREFIX = 'SE-PLS';
const STATE  = { SCANNING:'SCANNING', LOADING:'LOADING', HOLDING:'HOLDING', EXITING:'EXITING', STOPPED:'STOPPED' };

class SePulseEngine {

  constructor(config, notifier) {
    this.config   = config;
    this.notifier = notifier;
    const cfg = config.pulse || {};

    this.isRunning      = false;
    this.cycleCount     = 0;
    this.currentState   = STATE.SCANNING;
    this.dryRun         = cfg.dryRun !== false;
    this.capital        = cfg.capitalUSDC || 150;
    this.portfolioValue = this.capital;
    this.totalPnl       = 0;
    this.dailyPnl       = 0;
    this.maxDailyLoss   = cfg.maxDailyLoss || 0.04;
    this.circuitBroken  = false;

    this.entryPrice     = null;
    this.entryTime      = null;
    this.dipPct         = null;
    this.priceHistory   = []; // rolling prices for dip detection
    this.volumeHistory  = []; // rolling volumes for confirmation

    this.strategy = new SePulseStrategy(cfg);
    this.storage  = new SePulseStorage();

    this.lastCycleTime  = null;
    this.dailyResetTime = Date.now();
    this.tradeCount     = 0;
  }

  async start(intervalMinutes = 240) {
    this.isRunning = true;
    console.log('\n[' + PREFIX + '] Starting S.E Pulse Engine');
    console.log('[' + PREFIX + '] Mode: ' + (this.dryRun ? 'DRY RUN' : '⚠️  LIVE'));
    console.log('[' + PREFIX + '] Capital: $' + this.capital);
    console.log('[' + PREFIX + '] Strategy: Mean reversion — buy dips, sell recovery\n');
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
    console.log('\n[' + PREFIX + '] ─── Cycle #' + this.cycleCount + ' @ ' + new Date().toLocaleTimeString() + ' ───');

    try {
      this._checkDailyReset();
      if (this._circuitBreakerTripped()) return;

      const data = await this._fetchData();
      if (!data) { console.log('[' + PREFIX + '] ⚠️  No data — skipping'); return; }

      // Track price and volume history
      this.priceHistory.push(data.btcPrice);
      this.volumeHistory.push(data.volume24h);
      if (this.priceHistory.length > 12) this.priceHistory.shift(); // 48H window
      if (this.volumeHistory.length > 12) this.volumeHistory.shift();

      const signals = this._evaluateSignals(data);
      console.log('[' + PREFIX + '] BTC: $' + data.btcPrice.toFixed(0) + ' | Dip: ' + signals.dipPct.toFixed(2) + '% | Vol: ' + signals.volumeMult.toFixed(2) + 'x | PnL: ' + signals.pnlPct.toFixed(2) + '% | State: ' + this.currentState);

      const next = this.strategy.evaluate(this.currentState, signals);
      if (next !== this.currentState) await this._transition(next, signals);

      await this._executeDecision(signals, data);

      this.storage.logCycle({
        timestamp:      this.lastCycleTime,
        cycle:          this.cycleCount,
        state:          this.currentState,
        btcPrice:       data.btcPrice,
        dipPct:         signals.dipPct,
        portfolioValue: this.portfolioValue,
        dailyPnl:       this.dailyPnl,
        signals:        JSON.stringify(signals)
      });

      console.log('[' + PREFIX + '] ✅ Portfolio: $' + this.portfolioValue.toFixed(2) + ' | Trades: ' + this.tradeCount);

    } catch(err) {
      console.error('[' + PREFIX + '] ❌ Error:', err?.message || err);
      this.storage.logError({ timestamp: new Date().toISOString(), error: err?.message || String(err) });
    }
  }

  async _fetchData() {
    try {
      const [priceData, tickerData] = await Promise.all([
        this._get('https://api.kraken.com/0/public/Ticker?pair=XBTUSDC'),
        this._get('https://api.kraken.com/0/public/OHLC?pair=XBTUSDC&interval=240') // 4H candles
      ]);

      const r         = priceData?.result || {};
      const btcPrice  = parseFloat(r['XBTUSDC']?.c?.[0] || 0);
      const volume24h = parseFloat(r['XBTUSDC']?.v?.[1] || 0); // 24H volume
      const high24h   = parseFloat(r['XBTUSDC']?.h?.[1] || btcPrice);
      const low24h    = parseFloat(r['XBTUSDC']?.l?.[1] || btcPrice);

      // Get recent candles for dip calculation
      const ohlc    = tickerData?.result?.XBTUSDC || [];
      const candles = ohlc.slice(-6); // last 6 x 4H = 24H

      if (!btcPrice) return null;

      return { btcPrice, volume24h, high24h, low24h, candles };
    } catch(e) {
      console.warn('[' + PREFIX + '] Fetch error:', e.message);
      return null;
    }
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

  _evaluateSignals(data) {
    const cfg = this.config.pulse || {};

    // Calculate dip from recent high
    const recentHigh = this.priceHistory.length >= 2
      ? Math.max(...this.priceHistory.slice(-6))
      : data.high24h;
    const dipPct = recentHigh > 0
      ? ((data.btcPrice - recentHigh) / recentHigh * 100)
      : 0;

    // Volume multiplier vs average
    const avgVolume = this.volumeHistory.length >= 3
      ? this.volumeHistory.slice(-6).reduce((a, v) => a + v, 0) / Math.min(this.volumeHistory.length, 6)
      : data.volume24h;
    const volumeMult = avgVolume > 0 ? data.volume24h / avgVolume : 1;

    // Hours held
    const hoursHeld = this.entryTime
      ? (Date.now() - this.entryTime) / 3600000
      : 0;

    // PnL if holding
    const pnlPct = this.entryPrice
      ? ((data.btcPrice - this.entryPrice) / this.entryPrice * 100)
      : 0;

    const dipThreshold  = cfg.dipThreshold  || -2.5;
    const minVolumeMult = cfg.minVolumeMult || 1.2;

    return {
      btcPrice:        data.btcPrice,
      dipPct,
      volumeMult,
      hoursHeld,
      pnlPct,
      dipDetected:     dipPct <= dipThreshold,
      volumeConfirmed: volumeMult >= minVolumeMult || this.priceHistory.length < 3,
      recentHigh
    };
  }

  async _executeDecision(signals, data) {
    // Open position on dip
    if (this.currentState === STATE.LOADING && !this.entryPrice) {
      this.entryPrice = data.btcPrice;
      this.entryTime  = Date.now();
      this.dipPct     = signals.dipPct;
      console.log('[' + PREFIX + '] ' + (this.dryRun ? 'DRY RUN — ' : '') + '📉 BUY BTC @ $' + data.btcPrice.toFixed(0) + ' | Dip: ' + signals.dipPct.toFixed(2) + '%');
      if (!this.dryRun) {
        await this.notifier.send('[SE-PLS] 📉 PULSE BUY\nBTC @ $' + data.btcPrice.toFixed(0) + '\nDip: ' + signals.dipPct.toFixed(2) + '%\nCapital: $' + this.capital);
      }
      await this._transition(STATE.HOLDING, signals);
    }

    // Close position
    if (this.currentState === STATE.EXITING && this.entryPrice) {
      const pnlPct = ((data.btcPrice - this.entryPrice) / this.entryPrice * 100);
      const pnlUsd = this.capital * (pnlPct / 100);
      const hoursHeld = (Date.now() - this.entryTime) / 3600000;

      let exitReason = 'TARGET';
      if (pnlPct <= (this.config.pulse?.stopLoss || -4)) exitReason = 'STOP_LOSS';
      else if (hoursHeld >= (this.config.pulse?.maxHoldHours || 24)) exitReason = 'TIMEOUT';

      this.portfolioValue += pnlUsd;
      this.dailyPnl       += pnlUsd;
      this.totalPnl       += pnlUsd;
      this.tradeCount++;

      const outcome = pnlUsd > 0 ? 'WIN ✅' : 'LOSS ❌';
      console.log('[' + PREFIX + '] ' + outcome + ' | Entry: $' + this.entryPrice.toFixed(0) + ' → $' + data.btcPrice.toFixed(0) + ' | PnL: ' + pnlPct.toFixed(2) + '% ($' + pnlUsd.toFixed(2) + ') | Reason: ' + exitReason);

      this.storage.logTrade({
        timestamp:   this.lastCycleTime,
        entry_price: this.entryPrice,
        exit_price:  data.btcPrice,
        dip_pct:     this.dipPct,
        pnl_pct:     pnlPct,
        pnl_usd:     pnlUsd,
        hold_hours:  hoursHeld,
        exit_reason: exitReason,
        dry_run:     this.dryRun ? 1 : 0
      });

      if (!this.dryRun) {
        await this.notifier.send('[SE-PLS] ' + outcome + ' PULSE CLOSE\nEntry: $' + this.entryPrice.toFixed(0) + ' → $' + data.btcPrice.toFixed(0) + '\nPnL: ' + pnlPct.toFixed(2) + '% | ' + exitReason + '\nPortfolio: $' + this.portfolioValue.toFixed(2));
      }

      this.entryPrice = null;
      this.entryTime  = null;
      this.dipPct     = null;
      await this._transition(STATE.SCANNING, signals);
    }
  }

  getStatus() {
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
      entryPrice:     this.entryPrice,
      isRunning:      this.isRunning
    };
  }

  getState() { return this.currentState; }

  async _transition(newState, signals) {
    const from = this.currentState;
    this.currentState = newState;
    console.log('[' + PREFIX + '] 🔄 ' + from + ' → ' + newState);
    this.storage.logTransition({ timestamp: new Date().toISOString(), from, to: newState, signals: JSON.stringify(signals) });
  }

  _circuitBreakerTripped() {
    if (this.circuitBroken) return true;
    if (this.dailyPnl < -(this.capital * this.maxDailyLoss)) {
      this.circuitBroken = true;
      this.currentState  = STATE.STOPPED;
      console.log('[' + PREFIX + '] ⛔ Circuit breaker tripped');
      this.notifier.send('[SE-PLS] ⛔ Circuit breaker. Daily loss: $' + Math.abs(this.dailyPnl).toFixed(2));
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

module.exports = SePulseEngine;
