// engines/se-goldforge/engine.js
// S.E GoldForge — Tether Gold (XAUT/USDT) on Kraken
// Enters during crypto fear, exits when crypto recovers
'use strict';

const SeGoldForgeStrategy = require('./strategy');
const SeGoldForgeStorage  = require('./storage');

const PREFIX = 'SE-GF';
const STATE  = { DORMANT:'DORMANT', WATCHING:'WATCHING', ACTIVE:'ACTIVE', HOLDING:'HOLDING', EXITING:'EXITING', STOPPED:'STOPPED' };

class SeGoldForgeEngine {

  constructor(config, notifier) {
    this.config   = config;
    this.notifier = notifier;
    const cfg = config.goldForge || {};

    this.isRunning      = false;
    this.cycleCount     = 0;
    this.currentState   = STATE.DORMANT;
    this.dryRun         = cfg.dryRun !== false;
    this.capital        = cfg.capitalUSDC || 100;
    this.portfolioValue = this.capital;
    this.totalPnl       = 0;
    this.dailyPnl       = 0;
    this.dailyTrades    = 0;
    this.maxDailyLoss   = cfg.maxDailyLoss || 0.03;
    this.circuitBroken  = false;

    this.entryPrice     = null;
    this.entryFG        = null;
    this.goldHistory    = []; // rolling gold prices for momentum

    this.strategy = new SeGoldForgeStrategy(cfg);
    this.storage  = new SeGoldForgeStorage();

    this.lastCycleTime  = null;
    this.dailyResetTime = Date.now();
  }

  async start(intervalMinutes = 240) {
    this.isRunning = true;
    console.log('\n[' + PREFIX + '] Starting S.E GoldForge Engine');
    console.log('[' + PREFIX + '] Mode: ' + (this.dryRun ? 'DRY RUN' : '⚠️  LIVE'));
    console.log('[' + PREFIX + '] Capital: $' + this.capital);
    console.log('[' + PREFIX + '] Asset: XAUT/USDT (Tether Gold)\n');
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

      // Track gold price history for momentum
      this.goldHistory.push(data.goldPrice);
      if (this.goldHistory.length > 10) this.goldHistory.shift();

      const signals = this._evaluateSignals(data);
      console.log('[' + PREFIX + '] XAUT: $' + data.goldPrice.toFixed(2) + ' | F&G: ' + data.fearGreed + ' | Gold Mom: ' + signals.goldMomentum.toFixed(2) + '% | State: ' + this.currentState);

      const next = this.strategy.evaluate(this.currentState, signals);
      if (next !== this.currentState) await this._transition(next, signals);

      await this._executeDecision(signals, data);

      this.storage.logCycle({
        timestamp:      this.lastCycleTime,
        cycle:          this.cycleCount,
        state:          this.currentState,
        goldPrice:      data.goldPrice,
        fearGreed:      data.fearGreed,
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
      const [fgData, priceData] = await Promise.all([
        this._get('https://api.alternative.me/fng/?limit=1'),
        this._get('https://api.kraken.com/0/public/Ticker?pair=XAUTUSDT,XBTUSDC')
      ]);

      const fearGreed = parseInt(fgData?.data?.[0]?.value || 50);
      const r         = priceData?.result || {};
      const goldPrice = parseFloat(r['XAUTUSDT']?.c?.[0] || 0);
      const btcPrice  = parseFloat(r['XBTUSDC']?.c?.[0]  || 0);

      if (!goldPrice) return null;

      return { fearGreed, goldPrice, btcPrice };
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
    const cfg = this.config.goldForge || {};

    // Gold momentum — % change over last 5 cycles
    const goldMomentum = this.goldHistory.length >= 5
      ? ((this.goldHistory[this.goldHistory.length-1] - this.goldHistory[this.goldHistory.length-5]) / this.goldHistory[this.goldHistory.length-5] * 100)
      : 0;

    return {
      fearGreed:        data.fearGreed,
      goldPrice:        data.goldPrice,
      btcPrice:         data.btcPrice,
      goldMomentum,
      goldRising:       goldMomentum > (cfg.entryGoldMom || 0.5),
      extremeFear:      data.fearGreed <= (cfg.entryFearGreed || 25),
      fearBuilding:     data.fearGreed <= (cfg.watchFearGreed || 35),
      cryptoRecovering: data.fearGreed >= (cfg.exitFearGreed  || 55),
      pnlPct: this.entryPrice
        ? ((data.goldPrice - this.entryPrice) / this.entryPrice * 100)
        : 0
    };
  }

  async _executeDecision(signals, data) {
    // Open position
    if (this.currentState === STATE.ACTIVE && !this.entryPrice) {
      this.entryPrice = data.goldPrice;
      this.entryFG    = data.fearGreed;
      console.log('[' + PREFIX + '] ' + (this.dryRun ? 'DRY RUN — ' : '') + '🥇 BUY XAUT @ $' + data.goldPrice.toFixed(2) + ' | F&G: ' + data.fearGreed);
      if (!this.dryRun) {
        await this.notifier.send('[SE-GF] 🥇 BUY XAUT/USDT\nPrice: $' + data.goldPrice.toFixed(2) + '\nF&G: ' + data.fearGreed + ' (Fear)\nCapital: $' + this.capital);
      }
      await this._transition(STATE.HOLDING, signals);
    }

    // Close position
    if (this.currentState === STATE.EXITING && this.entryPrice) {
      const pnlPct = ((data.goldPrice - this.entryPrice) / this.entryPrice * 100);
      const pnl    = this.capital * (pnlPct / 100);
      this.portfolioValue += pnl;
      this.dailyPnl       += pnl;
      this.totalPnl       += pnl;
      this.dailyTrades++;

      const outcome = pnl > 0 ? 'WIN ✅' : 'LOSS ❌';
      console.log('[' + PREFIX + '] ' + outcome + ' | Entry: $' + this.entryPrice.toFixed(2) + ' → $' + data.goldPrice.toFixed(2) + ' | PnL: ' + pnlPct.toFixed(2) + '% ($' + pnl.toFixed(2) + ')');

      this.storage.logTrade({
        timestamp:   this.lastCycleTime,
        entry_price: this.entryPrice,
        exit_price:  data.goldPrice,
        entry_fg:    this.entryFG,
        exit_fg:     data.fearGreed,
        pnl_pct:     pnlPct,
        pnl_usd:     pnl,
        dry_run:     this.dryRun ? 1 : 0
      });

      if (!this.dryRun) {
        await this.notifier.send('[SE-GF] ' + outcome + ' CLOSE XAUT\nEntry: $' + this.entryPrice.toFixed(2) + ' → $' + data.goldPrice.toFixed(2) + '\nPnL: ' + pnlPct.toFixed(2) + '% ($' + pnl.toFixed(2) + ')\nPortfolio: $' + this.portfolioValue.toFixed(2));
      }

      this.entryPrice = null;
      this.entryFG    = null;
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
      entryPrice:     this.entryPrice,
      goldHistory:    this.goldHistory.slice(-3),
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
      this.notifier.send('[SE-GF] ⛔ Circuit breaker tripped. Daily loss: $' + this.dailyPnl.toFixed(2));
      return true;
    }
    return false;
  }

  _checkDailyReset() {
    if ((Date.now() - this.dailyResetTime) >= 86400000) {
      this.dailyPnl = 0; this.dailyTrades = 0;
      this.circuitBroken = false; this.dailyResetTime = Date.now();
    }
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = SeGoldForgeEngine;
