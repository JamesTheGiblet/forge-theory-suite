// engines/se-alt-season/engine.js
// S.E Alt Season — BTC Dominance Rotation Engine
'use strict';

const SeAltSeasonStrategy = require('./strategy');
const SeAltSeasonStorage  = require('./storage');

const PREFIX = 'SE-ALT';
const STATE  = { DORMANT:'DORMANT', WATCHING:'WATCHING', ROTATING:'ROTATING', HOLDING:'HOLDING', EXITING:'EXITING', STOPPED:'STOPPED' };

class SeAltSeasonEngine {
  constructor(config, notifier) {
    this.config   = config;
    this.notifier = notifier;
    const cfg = config.altSeason || {};
    this.isRunning    = false;
    this.cycleCount   = 0;
    this.currentState = STATE.DORMANT;
    this.dryRun       = cfg.dryRun !== false;
    this.capital      = cfg.capitalUSDC || 100;
    this.portfolioValue = this.capital;
    this.totalPnl     = 0;
    this.dailyPnl     = 0;
    this.dailyTrades  = 0;
    this.maxDailyLoss = cfg.maxDailyLoss || 0.03;
    this.circuitBroken = false;
    this.position     = null;
    this.domHistory   = [];
    this.strategy     = new SeAltSeasonStrategy(cfg);
    this.storage      = new SeAltSeasonStorage();
    this.lastCycleTime  = null;
    this.dailyResetTime = Date.now();
  }

  async start(intervalMinutes = 240) {
    this.isRunning = true;
    console.log('\n[' + PREFIX + '] Starting S.E Alt Season Engine');
    console.log('[' + PREFIX + '] Mode: ' + (this.dryRun ? 'DRY RUN' : 'LIVE'));
    console.log('[' + PREFIX + '] Capital: $' + this.capital + '\n');
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
      if (!data) { console.log('[' + PREFIX + '] No data — skipping'); return; }
      this.domHistory.push(data.btcDominance);
      if (this.domHistory.length > 20) this.domHistory.shift();
      const signals  = this._evaluateSignals(data);
      console.log('[' + PREFIX + '] BTC Dom: ' + data.btcDominance.toFixed(1) + '% | F&G: ' + data.fearGreed + ' | State: ' + this.currentState);
      const next = this.strategy.evaluate(this.currentState, signals);
      if (next !== this.currentState) await this._transition(next, signals);
      await this._executeDecision(signals, data);
      this.storage.logCycle({ timestamp: this.lastCycleTime, cycle: this.cycleCount, state: this.currentState, portfolioValue: this.portfolioValue, dailyPnl: this.dailyPnl, signals: JSON.stringify(signals) });
      console.log('[' + PREFIX + '] Portfolio: $' + this.portfolioValue.toFixed(2));
    } catch(err) {
      console.error('[' + PREFIX + '] Error:', err?.message || err);
    }
  }

  async _fetchData() {
    try {
      const [fgData, domData, priceData] = await Promise.all([
        this._get('https://api.alternative.me/fng/?limit=1'),
        this._get('https://api.coingecko.com/api/v3/global'),
        this._get('https://api.kraken.com/0/public/Ticker?pair=ETHUSDC,SOLUSDC,XBTUSDC')
      ]);
      const fearGreed    = parseInt(fgData?.data?.[0]?.value || 50);
      const btcDominance = domData?.data?.market_cap_percentage?.btc || 55;
      const r = priceData?.result || {};
      const btcPrice = parseFloat(r['XBTUSDC']?.c?.[0] || 0);
      const ethPrice = parseFloat(r['ETHUSDC']?.c?.[0] || 0);
      const solPrice = parseFloat(r['SOLUSDC']?.c?.[0] || 0);
      if (!btcPrice) return null;
      return { fearGreed, btcDominance, btcPrice, ethPrice, solPrice };
    } catch(e) { console.warn('[' + PREFIX + '] Fetch error:', e.message); return null; }
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
    const cfg = this.config.altSeason || {};
    const domTrend = this.domHistory.length >= 5
      ? this.domHistory[this.domHistory.length-1] - this.domHistory[this.domHistory.length-5]
      : 0;
    return {
      btcDominance:  data.btcDominance,
      fearGreed:     data.fearGreed,
      ethPrice:      data.ethPrice,
      solPrice:      data.solPrice,
      domFalling:    domTrend < -1,
      domLow:        data.btcDominance < (cfg.activeDominance || 50),
      domBuilding:   data.btcDominance < (cfg.entryDominance  || 52),
      domRecovering: data.btcDominance > (cfg.exitDominance   || 55),
      position:      this.position,
      pnlPct: this.position
        ? ((data[this.position.asset + 'Price'] - this.position.entryPrice) / this.position.entryPrice * 100)
        : 0
    };
  }

  async _executeDecision(signals, data) {
    if (this.currentState === STATE.ROTATING && !this.position) {
      const asset      = signals.ethPrice > 0 ? 'eth' : 'sol';
      const entryPrice = asset === 'eth' ? data.ethPrice : data.solPrice;
      this.position    = { asset, entryPrice, entryDom: data.btcDominance };
      console.log('[' + PREFIX + '] ' + (this.dryRun ? 'DRY RUN — ' : '') + 'BUY ' + asset.toUpperCase() + ' @ $' + entryPrice.toFixed(2));
      await this._transition(STATE.HOLDING, signals);
    }
    if (this.currentState === STATE.EXITING && this.position) {
      const currentPrice = this.position.asset === 'eth' ? data.ethPrice : data.solPrice;
      const pnlPct = ((currentPrice - this.position.entryPrice) / this.position.entryPrice * 100);
      const pnl    = this.capital * (pnlPct / 100);
      this.portfolioValue += pnl;
      this.dailyPnl       += pnl;
      this.totalPnl       += pnl;
      this.dailyTrades++;
      console.log('[' + PREFIX + '] CLOSE ' + (pnl > 0 ? 'WIN' : 'LOSS') + ' | PnL: ' + pnlPct.toFixed(2) + '%');
      this.storage.logTrade({ timestamp: this.lastCycleTime, asset: this.position.asset, entry_price: this.position.entryPrice, exit_price: currentPrice, entry_dom: this.position.entryDom, exit_dom: data.btcDominance, pnl_pct: pnlPct, pnl_usd: pnl, dry_run: this.dryRun ? 1 : 0 });
      this.position = null;
      await this._transition(STATE.DORMANT, signals);
    }
  }

  getStatus() {
    return { engine: PREFIX, state: this.currentState, cycle: this.cycleCount, dryRun: this.dryRun, capital: this.capital, portfolioValue: this.portfolioValue, totalPnl: this.totalPnl, position: this.position ? this.position.asset.toUpperCase() : 'NONE', isRunning: this.isRunning };
  }

  getState() { return this.currentState; }

  async _transition(newState, signals) {
    const from = this.currentState;
    this.currentState = newState;
    console.log('[' + PREFIX + '] ' + from + ' → ' + newState);
    this.storage.logTransition({ timestamp: new Date().toISOString(), from, to: newState, signals: JSON.stringify(signals) });
  }

  _circuitBreakerTripped() {
    if (this.circuitBroken) return true;
    if (this.dailyPnl < -(this.capital * this.maxDailyLoss)) {
      this.circuitBroken = true;
      this.currentState  = STATE.STOPPED;
      console.log('[' + PREFIX + '] Circuit breaker tripped');
      return true;
    }
    return false;
  }

  _checkDailyReset() {
    if ((Date.now() - this.dailyResetTime) >= 86400000) {
      this.dailyPnl = 0; this.dailyTrades = 0; this.circuitBroken = false; this.dailyResetTime = Date.now();
    }
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = SeAltSeasonEngine;
