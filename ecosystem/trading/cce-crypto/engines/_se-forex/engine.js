// engines/se-forex/engine.js
// CCE Core Framework — SE Forex Engine
// EUR/USD Oversold Fade using Z-Score + RSI + Session filter
// Wires into existing ForexDataFeed and forex-strategy signals

'use strict';

const SeForexStrategy = require('./strategy');
const SeForexStorage  = require('./storage');
const ForexDataFeed   = require('../../src/forex-data-feed');

const PREFIX = 'SE-FOR';

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  ACTIVE:   'ACTIVE',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class SeForexEngine {

  constructor(config, notifier, exchangeConnector = null) {
    this.config   = config;
    this.notifier = notifier;
    this.exchange = exchangeConnector;

    const cfg = config.seForex || config.forex || {};

    this.isRunning    = false;
    this.cycleCount   = 0;
    this.currentState = STATE.DORMANT;
    this.prevState    = STATE.DORMANT;

    this.dryRun = cfg.dryRun !== false;

    this.capital        = cfg.startingCapital || cfg.capitalUSDC || 300;
    this.portfolioValue = this.capital;
    this.totalPnl       = 0;
    this.dailyPnl       = 0;
    this.dailyTrades    = 0;

    this.maxDailyLoss  = cfg.maxDailyLoss || 0.03;
    this.circuitBroken = false;

    this.strategy = new SeForexStrategy(cfg);
    this.storage  = new SeForexStorage();
    this.dataFeed = new ForexDataFeed(config);

    // Position tracking
    this.position = null;

    this.lastCycleTime  = null;
    this.lastTransition = null;
    this.dailyResetTime = Date.now();
  }

  async start(intervalMinutes = 60) {
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`\n[${PREFIX}] Starting SE Forex Engine`);
    console.log(`[${PREFIX}] ⏱️  Cycle: ${intervalMinutes} minutes`);
    console.log(`[${PREFIX}] 🔧 Mode: ${this.dryRun ? 'DRY RUN' : '⚠️  LIVE'}`);
    console.log(`[${PREFIX}] 💰 Capital: $${this.capital}`);
    console.log(`[${PREFIX}] 📍 Pair: EUR/USD | Strategy: Oversold Fade\n`);

    while (this.isRunning) {
      await this.runCycle();
      if (!this.isRunning) break;
      console.log(`[${PREFIX}] ⏳ Next run: ${new Date(Date.now() + intervalMs).toLocaleTimeString()}`);
      await this._sleep(intervalMs);
    }
  }

  stop() {
    console.log(`\n[${PREFIX}] 🛑 Stopping...`);
    this.isRunning = false;
    this.storage.close();
  }

  async runCycle() {
    this.cycleCount++;
    const start = Date.now();
    this.lastCycleTime = new Date().toISOString();

    console.log(`\n[${PREFIX}] ─── Cycle #${this.cycleCount} @ ${new Date().toLocaleTimeString()} ───`);

    try {
      this._checkDailyReset();

      if (this._circuitBreakerTripped()) {
        console.log(`[${PREFIX}] ⛔ Circuit breaker active — skipping cycle`);
        return;
      }

      const data = await this._fetchData();
      if (!data) {
        console.log(`[${PREFIX}] ⚠️  No data — skipping cycle`);
        return;
      }

      const signals = this._evaluateSignals(data);
      console.log(`[${PREFIX}] 💱 EUR/USD: ${data.price.toFixed(5)}`);
      console.log(`[${PREFIX}] 📊 Z: ${signals.zScore.toFixed(2)} | RSI: ${signals.rsi.toFixed(1)} | Session: ${signals.session} | State: ${this.currentState}`);

      const nextState = this.strategy.evaluate(this.currentState, signals, data);

      if (nextState !== this.currentState) {
        await this._transition(nextState, signals);
      }

      await this._executeDecision(signals, data);

      this.storage.logCycle({
        timestamp:      this.lastCycleTime,
        cycle:          this.cycleCount,
        state:          this.currentState,
        portfolioValue: this.portfolioValue,
        dailyPnl:       this.dailyPnl,
        signals:        JSON.stringify(signals)
      });

      console.log(`[${PREFIX}] ✅ ${Date.now() - start}ms | Portfolio: $${this.portfolioValue.toFixed(2)} | DayPnL: ${this.dailyPnl >= 0 ? '+' : ''}${this.dailyPnl.toFixed(4)}`);

    } catch (err) {
      console.error(`[${PREFIX}] ❌ Cycle error: ${err.message}`);
      this.storage.logError({ timestamp: new Date().toISOString(), error: err.message });
    }
  }

  // ── FETCH DATA ────────────────────────────────────────────────────────────────

  async _fetchData() {
    try {
      const data = await this.dataFeed.getMarketData();
      if (!data || data.error || !data.price) {
        console.warn(`[${PREFIX}] ⚠️  Data feed error — ${data?.error || 'no price'}`);
        return null;
      }
      return data;
    } catch (e) {
      console.warn(`[${PREFIX}] ⚠️  Data feed exception: ${e.message}`);
      return null;
    }
  }

  // ── EVALUATE SIGNALS ──────────────────────────────────────────────────────────

  _evaluateSignals(data) {
    const closes = data.closes || [];
    const price  = data.price;

    // Z-Score — how far price is from its mean (20-period)
    const period = Math.min(20, closes.length);
    const slice  = closes.slice(-period);
    const mean   = slice.reduce((a, b) => a + b, 0) / slice.length;
    const std    = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length) || 0.0001;
    const zScore = (price - mean) / std;

    // RSI (14-period)
    const rsi = this._calcRSI(closes, 14);

    // SMA crossover
    const sma20 = closes.length >= 20
      ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20
      : price;
    const sma50 = closes.length >= 50
      ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50
      : price;

    // ATR (14-period)
    const atr = this._calcATR(closes, 14);

    // Session (UTC hour)
    const hourUTC = data.hourUTC || new Date().getUTCHours();
    const session = hourUTC >= 8 && hourUTC < 17 ? 'LONDON'
      : hourUTC >= 13 && hourUTC < 22 ? 'NEW_YORK'
      : hourUTC >= 0 && hourUTC < 8 ? 'ASIA'
      : 'OFF';

    // Trend
    const trend7d = closes.length >= 7
      ? (closes[closes.length - 1] - closes[closes.length - 7]) / closes[closes.length - 7]
      : 0;

    return {
      price,
      zScore,
      rsi,
      sma20,
      sma50,
      atr,
      session,
      trend7d,
      aboveSma20:  price > sma20,
      aboveSma50:  price > sma50,
      oversold:    rsi < 35 && zScore < -1.5,
      overbought:  rsi > 65 && zScore > 1.5,
      goodSession: session === 'LONDON' || session === 'NEW_YORK'
    };
  }

  // ── EXECUTE DECISION ──────────────────────────────────────────────────────────

  async _executeDecision(signals, data) {
    switch (this.currentState) {

      case STATE.ACTIVE:
        if (!this.position) {
          // Open position
          const stopLoss   = +(data.price - signals.atr * 1.5).toFixed(5);
          const takeProfit = +(data.price + signals.atr * 3.0).toFixed(5);
          this.position = {
            entryPrice:  data.price,
            stopLoss,
            takeProfit,
            entryTime:   Date.now(),
            size:        this.capital * 0.02 // 2% risk per trade
          };
          console.log(`[${PREFIX}] 🎯 ${this.dryRun ? 'DRY RUN — ' : ''}LONG @ ${data.price} | SL: ${stopLoss} | TP: ${takeProfit}`);
          if (!this.dryRun) {
            await this.notifier.send(
              `[${PREFIX}] 🎯 BUY EUR/USD @ ${data.price}\nSL: ${stopLoss} | TP: ${takeProfit}\nRisk: $${this.position.size.toFixed(2)}`,
              'trade'
            );
          }
        } else {
          // Check stop/target
          if (data.price <= this.position.stopLoss) {
            await this._closePosition(data.price, 'STOP_LOSS');
            await this._transition(STATE.EXITING, signals);
          } else if (data.price >= this.position.takeProfit) {
            await this._closePosition(data.price, 'TAKE_PROFIT');
            await this._transition(STATE.EXITING, signals);
          }
        }
        break;

      case STATE.EXITING:
        if (this.position) {
          await this._closePosition(data.price, 'EXIT');
        }
        await this._transition(STATE.DORMANT, signals);
        break;

      default:
        break;
    }
  }

  // ── CLOSE POSITION ────────────────────────────────────────────────────────────

  async _closePosition(exitPrice, reason) {
    if (!this.position) return;

    const pips    = Math.round((exitPrice - this.position.entryPrice) * 10000);
    const pnl     = pips * (this.position.size / 100);
    const outcome = pips > 0 ? 'WIN' : pips < 0 ? 'LOSS' : 'BREAK_EVEN';

    this.portfolioValue += pnl;
    this.dailyPnl       += pnl;
    this.totalPnl       += pnl;
    this.dailyTrades++;

    console.log(`[${PREFIX}] 🚪 Close ${outcome}: ${pips > 0 ? '+' : ''}${pips} pips | PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);

    this.storage.logTrade({
      timestamp:   new Date().toISOString(),
      direction:   'LONG',
      entry_price: this.position.entryPrice,
      exit_price:  exitPrice,
      pips,
      pnl_usd:     pnl,
      outcome,
      reason,
      dry_run:     this.dryRun ? 1 : 0
    });

    if (!this.dryRun) {
      const emoji = pips > 0 ? '✅' : '❌';
      await this.notifier.send(
        `[${PREFIX}] ${emoji} ${outcome}: ${pips > 0 ? '+' : ''}${pips} pips\nExit: ${exitPrice} | PnL: $${pnl.toFixed(2)}\nPortfolio: $${this.portfolioValue.toFixed(2)}`,
        pips > 0 ? 'trade' : 'warning'
      );
    }

    this.position = null;
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  _calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    const slice = closes.slice(-(period + 1));
    let gains = 0, losses = 0;
    for (let i = 1; i < slice.length; i++) {
      const diff = slice[i] - slice[i - 1];
      if (diff >= 0) gains  += diff;
      else           losses -= diff;
    }
    const rs = gains / (losses || 0.0001);
    return 100 - (100 / (1 + rs));
  }

  _calcATR(closes, period = 14) {
    if (closes.length < 2) return 0.001;
    const trs = closes.slice(-period).map((c, i, arr) =>
      i === 0 ? 0 : Math.abs(c - arr[i - 1])
    ).filter(Boolean);
    return trs.reduce((a, b) => a + b, 0) / (trs.length || 1);
  }

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
      dailyTrades:   this.dailyTrades,
      lastCycle:     this.lastCycleTime,
      isRunning:     this.isRunning,
      position:      this.position ? 'OPEN' : 'NONE'
    };
  }

  getState() { return this.currentState; }

  async _transition(newState, signals) {
    const from = this.currentState;
    this.prevState    = from;
    this.currentState = newState;
    this.lastTransition = new Date().toISOString();
    console.log(`[${PREFIX}] 🔄 ${from} → ${newState}`);
    this.storage.logTransition({ timestamp: this.lastTransition, from, to: newState, signals: JSON.stringify(signals) });
  }

  _circuitBreakerTripped() {
    if (this.circuitBroken) return true;
    if (this.dailyPnl < -(this.capital * this.maxDailyLoss)) {
      this.circuitBroken = true;
      this.currentState  = STATE.STOPPED;
      console.log(`[${PREFIX}] ⛔ Circuit breaker tripped`);
      this.notifier.send(`[${PREFIX}] ⛔ Circuit breaker tripped. Daily loss: $${this.dailyPnl.toFixed(2)}`);
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
      console.log(`[${PREFIX}] 🔄 Daily stats reset`);
    }
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = SeForexEngine;
