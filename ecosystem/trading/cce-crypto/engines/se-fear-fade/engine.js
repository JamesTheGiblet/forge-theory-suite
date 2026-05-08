// engines/se-fear-fade/engine.js
// S.E Fear Fade — Counter-cyclical sentiment engine
// Buys BTC during Extreme Fear (F&G < 20), sells when Greed returns (F&G > 60)

'use strict';

const SeFearFadeStrategy = require('./strategy');
const SeFearFadeStorage  = require('./storage');

const PREFIX = 'SE-FF';

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  ACTIVE:   'ACTIVE',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class SeFearFadeEngine {

  constructor(config, notifier, exchange = null) {
    this.config   = config;
    this.notifier = notifier;
    this.exchange = exchange;  // Kraken exchange instance for live orders

    const cfg = config.fearFade || {};

    this.isRunning    = false;
    this.cycleCount   = 0;
    this.currentState = STATE.DORMANT;
    this.prevState    = STATE.DORMANT;

    this.dryRun = cfg.dryRun !== false;

    this.capital        = cfg.capitalUSDC || 100;
    this.portfolioValue = this.capital;
    this.totalPnl       = 0;
    this.dailyPnl       = 0;
    this.dailyTrades    = 0;

    this.maxDailyLoss  = cfg.maxDailyLoss || 0.03;
    this.circuitBroken = false;

    this.entryPrice  = null;
    this.entryFG     = null;
    this.positionSize = 0;

    this.strategy = new SeFearFadeStrategy(cfg);
    this.storage  = new SeFearFadeStorage();

    this.lastCycleTime  = null;
    this.lastTransition = null;
    this.dailyResetTime = Date.now();
  }

  async start(intervalMinutes = 240) {
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log('\n[' + PREFIX + '] Starting S.E Fear Fade Engine');
    console.log('[' + PREFIX + '] Mode: ' + (this.dryRun ? 'DRY RUN' : '⚠️  LIVE'));
    console.log('[' + PREFIX + '] Capital: $' + this.capital);
    console.log('[' + PREFIX + '] Strategy: Buy Extreme Fear, Sell Greed\n');

    while (this.isRunning) {
      await this.runCycle();
      if (!this.isRunning) break;
      await this._sleep(intervalMs);
    }
  }

  stop() {
    console.log('[' + PREFIX + '] 🛑 Stopping...');
    this.isRunning = false;
    this.storage.close();
  }

  async runCycle() {
    this.cycleCount++;
    const start = Date.now();
    this.lastCycleTime = new Date().toISOString();

    console.log('\n[' + PREFIX + '] ─── Cycle #' + this.cycleCount + ' @ ' + new Date().toLocaleTimeString() + ' ───');

    try {
      this._checkDailyReset();
      if (this._circuitBreakerTripped()) return;

      const data = await this._fetchData();
      if (!data) { console.log('[' + PREFIX + '] ⚠️  No data — skipping'); return; }

      const signals = this._evaluateSignals(data);
      console.log('[' + PREFIX + '] F&G: ' + data.fearGreed + ' | BTC: $' + data.btcPrice.toFixed(0) + ' | State: ' + this.currentState);

      const nextState = this.strategy.evaluate(this.currentState, signals, data);
      if (nextState !== this.currentState) await this._transition(nextState, signals);

      await this._executeDecision(signals, data);

      this.storage.logCycle({
        timestamp:      this.lastCycleTime,
        cycle:          this.cycleCount,
        state:          this.currentState,
        portfolioValue: this.portfolioValue,
        dailyPnl:       this.dailyPnl,
        signals:        JSON.stringify(signals)
      });

      console.log('[' + PREFIX + '] ✅ ' + (Date.now() - start) + 'ms | Portfolio: $' + this.portfolioValue.toFixed(2));

    } catch (err) {
      console.error('[' + PREFIX + '] ❌ Cycle error:', err?.message || err);
      this.storage.logError({ timestamp: new Date().toISOString(), error: err?.message || String(err) });
    }
  }

  // ── FETCH DATA ────────────────────────────────────────────────────────────────

  async _fetchData() {
    try {
      const https = require('https');
      const [fgData, btcData] = await Promise.all([
        this._fetchJson('https://api.alternative.me/fng/?limit=1'),
        this._fetchJson('https://api.kraken.com/0/public/Ticker?pair=XBTUSDC')
      ]);

      const fearGreed = parseInt(fgData?.data?.[0]?.value || 50);
      const btcResult = btcData?.result;
      const pair = btcResult ? Object.keys(btcResult)[0] : null;
      const btcPrice = pair ? parseFloat(btcResult[pair].c[0]) : 0;

      if (!btcPrice) return null;

      return { fearGreed, btcPrice, timestamp: Date.now() };
    } catch(e) {
      console.warn('[' + PREFIX + '] Data fetch error:', e.message);
      return null;
    }
  }

  _fetchJson(url) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      https.get(url, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      }).on('error', reject);
    });
  }

  // ── ORDER EXECUTION ──────────────────────────────────────────────────────────

  async _placeOrder(side, size, price = null) {
    if (this.dryRun) {
      console.log(`[${PREFIX}] DRY RUN — ${side} ${size.toFixed(8)} BTC`);
      return { orderId: 'dry-run', filled: size, price: price || 0 };
    }

    if (!this.exchange) {
      console.error(`[${PREFIX}] No exchange available`);
      return null;
    }

    try {
      const order = await this.exchange.createOrder('BTC/USDC', 'market', side, size, price);
      console.log(`[${PREFIX}] ✅ ${side} order filled: ${order.filled} BTC @ ${order.price}`);
      return order;
    } catch (err) {
      console.error(`[${PREFIX}] Order failed:`, err.message);
      await this.notifier.send(`[${PREFIX}] ❌ Order failed: ${side} BTC - ${err.message}`);
      return null;
    }
  }

  // ── EVALUATE SIGNALS ──────────────────────────────────────────────────────────

  _evaluateSignals(data) {
    const cfg = this.config.fearFade || {};
    const entryFG  = cfg.entryFearGreed  || 20;
    const exitFG   = cfg.exitFearGreed   || 60;
    const watchFG  = cfg.watchFearGreed  || 30;

    return {
      fearGreed:      data.fearGreed,
      btcPrice:       data.btcPrice,
      extremeFear:    data.fearGreed <= entryFG,
      fearBuilding:   data.fearGreed <= watchFG,
      greedReturning: data.fearGreed >= exitFG,
      entryPrice:     this.entryPrice,
      pnlPct: this.entryPrice
        ? ((data.btcPrice - this.entryPrice) / this.entryPrice * 100)
        : 0
    };
  }

  // ── EXECUTE DECISION ──────────────────────────────────────────────────────────

  async _executeDecision(signals, data) {
    if (this.currentState === STATE.ACTIVE && !this.entryPrice) {
      // Open position with real order
      const size = this.capital / data.btcPrice;
      const order = await this._placeOrder('buy', size);
      if (order) {
        this.entryPrice = order.price || data.btcPrice;
        this.entryFG = data.fearGreed;
        this.positionSize = order.filled || size;
        console.log(`[${PREFIX}] BUY BTC @ $${this.entryPrice.toFixed(0)} | F&G: ${data.fearGreed}`);
        if (!this.dryRun) {
          await this.notifier.send(`[${PREFIX}] 🟢 BUY BTC @ $${this.entryPrice.toFixed(0)}\nF&G: ${data.fearGreed} (Extreme Fear)\nSize: ${this.positionSize.toFixed(8)} BTC`);
        }
      }
    }

    if (this.currentState === STATE.EXITING && this.entryPrice) {
      // Close position with real order
      const size = this.positionSize || (this.capital / this.entryPrice);
      const order = await this._placeOrder('sell', size);
      if (order) {
        const exitPrice = order.price || data.btcPrice;
        const pnlPct = ((exitPrice - this.entryPrice) / this.entryPrice * 100);
        const pnl = this.capital * (pnlPct / 100);
        this.portfolioValue += pnl;
        this.dailyPnl += pnl;
        this.totalPnl += pnl;
        this.dailyTrades++;

        const outcome = pnl > 0 ? 'WIN ✅' : 'LOSS ❌';
        console.log(`[${PREFIX}] CLOSE ${outcome} | Entry: $${this.entryPrice.toFixed(0)} → Exit: $${exitPrice.toFixed(0)} | PnL: ${pnlPct.toFixed(2)}% ($${pnl.toFixed(2)})`);

        this.storage.logTrade({
          timestamp:   this.lastCycleTime,
          entry_price: this.entryPrice,
          exit_price:  exitPrice,
          entry_fg:    this.entryFG,
          exit_fg:     data.fearGreed,
          pnl_pct:     pnlPct,
          pnl_usd:     pnl,
          dry_run:     this.dryRun ? 1 : 0
        });

        if (!this.dryRun) {
          await this.notifier.send(`[${PREFIX}] ${outcome} CLOSE BTC\nEntry: $${this.entryPrice.toFixed(0)} → $${exitPrice.toFixed(0)}\nPnL: ${pnlPct.toFixed(2)}% ($${pnl.toFixed(2)})\nPortfolio: $${this.portfolioValue.toFixed(2)}`);
        }

        this.entryPrice = null;
        this.entryFG = null;
        this.positionSize = 0;
        await this._transition(STATE.DORMANT, signals);
      }
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  getStatus() {
    return {
      engine:        PREFIX,
      state:         this.currentState,
      cycle:         this.cycleCount,
      dryRun:        this.dryRun,
      capital:       this.capital,
      portfolioValue: this.portfolioValue,
      totalPnl:      this.totalPnl,
      dailyPnl:      this.dailyPnl,
      entryPrice:    this.entryPrice,
      positionSize:  this.positionSize,
      isRunning:     this.isRunning
    };
  }

  getState() { return this.currentState; }

  async _transition(newState, signals) {
    const from = this.currentState;
    this.prevState    = from;
    this.currentState = newState;
    this.lastTransition = new Date().toISOString();
    console.log('[' + PREFIX + '] 🔄 ' + from + ' → ' + newState);
    this.storage.logTransition({ timestamp: this.lastTransition, from, to: newState, signals: JSON.stringify(signals) });
  }

  _circuitBreakerTripped() {
    if (this.circuitBroken) return true;
    if (this.dailyPnl < -(this.capital * this.maxDailyLoss)) {
      this.circuitBroken = true;
      this.currentState  = STATE.STOPPED;
      console.log('[' + PREFIX + '] ⛔ Circuit breaker tripped');
      this.notifier.send('[' + PREFIX + '] ⛔ Circuit breaker tripped. Daily loss: $' + this.dailyPnl.toFixed(2));
      return true;
    }
    return false;
  }

  _checkDailyReset() {
    if ((Date.now() - this.dailyResetTime) >= 86400000) {
      this.dailyPnl       = 0;
      this.dailyTrades    = 0;
      this.circuitBroken  = false;
      this.dailyResetTime = Date.now();
    }
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = SeFearFadeEngine;
