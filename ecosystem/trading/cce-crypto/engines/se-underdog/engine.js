// engines/se-underdog/engine.js
// S.E Underdog — Quality beaten-down alt basket
// ALGO, DOT, ATOM, VET — buys during extreme fear, holds for rotation
'use strict';

const SeUnderdogStrategy = require('./strategy');
const SeUnderdogStorage  = require('./storage');

const PREFIX = 'SE-UD';
const STATE  = { DORMANT:'DORMANT', WATCHING:'WATCHING', LOADING:'LOADING', HOLDING:'HOLDING', EXITING:'EXITING', STOPPED:'STOPPED' };

// The underdog basket — quality projects at historic lows
const BASKET = [
  { asset: 'ALGO', pair: 'ALGO/USDC', weight: 0.25 },
  { asset: 'DOT',  pair: 'DOT/USDC',  weight: 0.25 },
  { asset: 'ATOM', pair: 'ATOM/USDC', weight: 0.25 },
  { asset: 'VET',  pair: 'VET/USDC',  weight: 0.25 }
];

class SeUnderdogEngine {

  constructor(config, notifier) {
    this.config   = config;
    this.notifier = notifier;
    const cfg = config.underdog || {};

    this.isRunning      = false;
    this.cycleCount     = 0;
    this.currentState   = STATE.DORMANT;
    this.dryRun         = cfg.dryRun !== false;
    this.capital        = cfg.capitalUSDC || 200;
    this.portfolioValue = this.capital;
    this.totalPnl       = 0;
    this.dailyPnl       = 0;
    this.maxDailyLoss   = cfg.maxDailyLoss || 0.03;
    this.circuitBroken  = false;

    this.positions      = {}; // { ALGO: { entryPrice, allocation }, ... }
    this.entryFG        = null;

    this.strategy = new SeUnderdogStrategy(cfg);
    this.storage  = new SeUnderdogStorage();

    this.lastCycleTime  = null;
    this.dailyResetTime = Date.now();
  }

  async start(intervalMinutes = 240) {
    this.isRunning = true;
    console.log('\n[' + PREFIX + '] Starting S.E Underdog Engine');
    console.log('[' + PREFIX + '] Mode: ' + (this.dryRun ? 'DRY RUN' : '⚠️  LIVE'));
    console.log('[' + PREFIX + '] Capital: $' + this.capital);
    console.log('[' + PREFIX + '] Basket: ' + BASKET.map(b => b.asset).join(', ') + '\n');
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

      const signals  = this._evaluateSignals(data);
      console.log('[' + PREFIX + '] F&G: ' + data.fearGreed + ' | BTC Dom: ' + data.btcDominance.toFixed(1) + '% | Basket PnL: ' + signals.basketPnl.toFixed(2) + '% | State: ' + this.currentState);

      const next = this.strategy.evaluate(this.currentState, signals);
      if (next !== this.currentState) await this._transition(next, signals);

      await this._executeDecision(signals, data);

      this.storage.logCycle({
        timestamp:      this.lastCycleTime,
        cycle:          this.cycleCount,
        state:          this.currentState,
        basketPnl:      signals.basketPnl,
        portfolioValue: this.portfolioValue,
        dailyPnl:       this.dailyPnl,
        signals:        JSON.stringify(signals)
      });

      console.log('[' + PREFIX + '] ✅ Portfolio: $' + this.portfolioValue.toFixed(2));

    } catch(err) {
      console.error('[' + PREFIX + '] ❌ Error:', err?.message || err);
      this.storage.logError({ timestamp: new Date().toISOString(), error: err?.message || String(err) });
    }
  }

  async _fetchData() {
    try {
      const pairs = BASKET.map(b => b.pair.replace('/', '')).join(',') + ',XBTUSDC';
      const [fgData, domData, priceData] = await Promise.all([
        this._get('https://api.alternative.me/fng/?limit=1'),
        this._get('https://api.coingecko.com/api/v3/global'),
        this._get('https://api.kraken.com/0/public/Ticker?pair=' + pairs)
      ]);

      const fearGreed    = parseInt(fgData?.data?.[0]?.value || 50);
      const btcDominance = domData?.data?.market_cap_percentage?.btc || 55;
      const r            = priceData?.result || {};

      const prices = {};
      for (const b of BASKET) {
        const key = b.pair.replace('/', '');
        prices[b.asset] = parseFloat(r[key]?.c?.[0] || 0);
      }

      return { fearGreed, btcDominance, prices };
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
    const cfg = this.config.underdog || {};

    // Calculate basket PnL if holding
    let basketPnl = 0;
    if (Object.keys(this.positions).length > 0) {
      let totalWeightedPnl = 0;
      for (const [asset, pos] of Object.entries(this.positions)) {
        const currentPrice = data.prices[asset] || pos.entryPrice;
        const pnl = ((currentPrice - pos.entryPrice) / pos.entryPrice * 100);
        totalWeightedPnl += pnl * pos.weight;
      }
      basketPnl = totalWeightedPnl;
    }

    return {
      fearGreed:      data.fearGreed,
      btcDominance:   data.btcDominance,
      prices:         data.prices,
      extremeFear:    data.fearGreed <= (cfg.entryFearGreed || 20),
      fearBuilding:   data.fearGreed <= (cfg.watchFearGreed || 35),
      greedReturning: data.fearGreed >= (cfg.exitFearGreed  || 60),
      domAcceptable:  data.btcDominance <= (cfg.entryDominance || 54),
      domTooHigh:     data.btcDominance > (cfg.exitDominance  || 58),
      basketPnl
    };
  }

  async _executeDecision(signals, data) {
    // Open basket positions
    if (this.currentState === STATE.LOADING && Object.keys(this.positions).length === 0) {
      const allocationPerAsset = this.capital / BASKET.length;
      this.entryFG = data.fearGreed;

      for (const b of BASKET) {
        const price = data.prices[b.asset];
        if (!price) continue;
        this.positions[b.asset] = { entryPrice: price, weight: b.weight, allocation: allocationPerAsset };
        console.log('[' + PREFIX + '] ' + (this.dryRun ? 'DRY RUN — ' : '') + 'BUY ' + b.asset + ' @ $' + price.toFixed(4) + ' ($' + allocationPerAsset.toFixed(2) + ')');
      }

      const assets = Object.keys(this.positions).join(', ');
      console.log('[' + PREFIX + '] 🛒 Basket loaded: ' + assets + ' | F&G: ' + data.fearGreed);

      if (!this.dryRun) {
        await this.notifier.send('[SE-UD] 🛒 UNDERDOG BASKET LOADED\n' + assets + '\nF&G: ' + data.fearGreed + '\nCapital: $' + this.capital);
      }
      await this._transition(STATE.HOLDING, signals);
    }

    // Close all positions
    if (this.currentState === STATE.EXITING && Object.keys(this.positions).length > 0) {
      let totalPnl = 0;

      for (const [asset, pos] of Object.entries(this.positions)) {
        const currentPrice = data.prices[asset] || pos.entryPrice;
        const pnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice * 100);
        const pnlUsd = pos.allocation * (pnlPct / 100);
        totalPnl += pnlUsd;

        console.log('[' + PREFIX + '] CLOSE ' + asset + ' | Entry: $' + pos.entryPrice.toFixed(4) + ' → $' + currentPrice.toFixed(4) + ' | PnL: ' + pnlPct.toFixed(2) + '%');

        this.storage.logTrade({
          timestamp:   this.lastCycleTime,
          asset,
          entry_price: pos.entryPrice,
          exit_price:  currentPrice,
          entry_fg:    this.entryFG,
          exit_fg:     data.fearGreed,
          pnl_pct:     pnlPct,
          pnl_usd:     pnlUsd,
          dry_run:     this.dryRun ? 1 : 0
        });
      }

      this.portfolioValue += totalPnl;
      this.dailyPnl       += totalPnl;
      this.totalPnl       += totalPnl;

      const outcome = totalPnl > 0 ? 'WIN ✅' : 'LOSS ❌';
      console.log('[' + PREFIX + '] ' + outcome + ' | Total PnL: $' + totalPnl.toFixed(2) + ' | Portfolio: $' + this.portfolioValue.toFixed(2));

      if (!this.dryRun) {
        await this.notifier.send('[SE-UD] ' + outcome + ' BASKET CLOSED\nTotal PnL: $' + totalPnl.toFixed(2) + '\nPortfolio: $' + this.portfolioValue.toFixed(2));
      }

      this.positions = {};
      this.entryFG   = null;
      await this._transition(STATE.DORMANT, signals);
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
      positions:      Object.keys(this.positions).join(', ') || 'NONE',
      basket:         BASKET.map(b => b.asset).join(', '),
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

module.exports = SeUnderdogEngine;
