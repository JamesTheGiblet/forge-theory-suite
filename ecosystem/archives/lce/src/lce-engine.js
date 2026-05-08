// src/lce-engine.js — LCE Core Orchestrator
// 5-minute cycle: fetch signals → evaluate FSM → execute → log → notify

const config = require('../config');
const DataFeed = require('./data-feed');
const { Strategy } = require('./strategy');
const ExchangeConnector = require('./exchange-connector');
const Storage = require('./storage');
const Notification = require('./notification');

class LCEEngine {
  constructor() {
    this.dataFeed = new DataFeed();
    this.strategy = new Strategy();
    this.exchange = new ExchangeConnector();
    this.storage = new Storage();
    this.notify = new Notification();
    this.cycleCount = 0;
    this.running = false;
  }

  async init() {
    await this.storage.init();
    const portfolio = await this.exchange.getPortfolioValue();
    console.log(`[LCE] ⚡ Liquidation Cascade Engine v${config.engine.version}`);
    console.log(`[LCE] 💰 Portfolio: $${portfolio.total.toFixed(2)}`);
    console.log(`[LCE] 📋 Mode: ${config.engine.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`[LCE] ⏱  Cycle: ${config.engine.cycleMs / 60000} minutes`);
    console.log(`[LCE] 👀 Watching: ${config.watchlist.join(', ')}`);
  }

  async runCycle() {
    this.cycleCount++;
    const cycleStart = Date.now();
    console.log(`\n[LCE] ─── Cycle #${this.cycleCount} @ ${new Date().toLocaleTimeString()} ──────────────`);

    try {
      // 1. Fetch all signal snapshots in parallel
      const snapshots = await Promise.all(
        config.watchlist.map(symbol => this.dataFeed.getSignalSnapshot(symbol))
      );

      // Log top liquidation activity
      for (const s of snapshots) {
        if (s.liq5m?.totalLiqUsd > 1_000_000) {
          console.log(`[LCE] 💧 ${s.symbol}: $${(s.liq5m.totalLiqUsd / 1e6).toFixed(1)}M liq | OI drop: ${(s.oi?.dropPct || 0).toFixed(2)}% | RSI: ${(s.price?.rsi || 0).toFixed(0)}`);
        }
      }

      // 2. Evaluate FSM
      const decision = this.strategy.evaluate(snapshots);
      console.log(`[LCE] 📊 State: ${decision.state} | Action: ${decision.action}`);

      // 3. Execute decision
      await this._executeDecision(decision, snapshots);

      // 4. Log cycle
      const status = this.strategy.getStatus();
      this.storage.logCycle(decision.state, decision.action, {
        cycleCount: this.cycleCount,
        dailyPnl: status.dailyPnlPct,
        dailyTrades: status.dailyTrades,
      });

      const elapsed = Date.now() - cycleStart;
      console.log(`[LCE] ✅ Cycle complete in ${elapsed}ms | Daily PnL: ${status.dailyPnlPct.toFixed(2)}% | Trades: ${status.dailyTrades}`);
      console.log(`[LCE] ⏳ Next run: ${new Date(Date.now() + config.engine.cycleMs).toLocaleTimeString()}`);

    } catch (err) {
      console.error(`[LCE] ❌ Cycle error: ${err.message}`);
    }
  }

  async _executeDecision(decision, snapshots) {
    switch (decision.action) {
      case 'STALKING':
        this.notify.cascadeDetected(decision.signal?.symbol, decision.signal?.liq5m?.totalLiqUsd || 0);
        break;

      case 'ENTER': {
        const snap = snapshots.find(s => s.symbol === decision.symbol);
        if (!snap?.price?.price) break;

        const portfolio = await this.exchange.getPortfolioValue();
        const position = await this.exchange.enterPosition(
          decision.symbol,
          decision.side,
          snap.price.price,
          portfolio.total
        );

        if (position) {
          this.strategy.setPosition(position);
          this.notify.tradeEntered(position);
        }
        break;
      }

      case 'EXIT': {
        const pos = this.strategy.activePosition;
        if (!pos) break;

        // Get current price for exit record
        const snap = snapshots.find(s => s.symbol === decision.symbol);
        const exitPrice = snap?.price?.price || pos.entryPrice;

        await this.exchange.exitPosition(pos);

        this.storage.logTrade({
          symbol: pos.symbol,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice,
          qty: pos.qty,
          sizeUsd: pos.sizeUsd,
          pnlPct: decision.pnlPct,
          reason: decision.reason,
          openedAt: pos.openedAt,
          closedAt: Date.now(),
          dryRun: config.engine.dryRun,
        });

        this.strategy.clearPosition();
        this.notify.tradeExited(decision.symbol, decision.reason, decision.pnlPct);
        break;
      }

      case 'CIRCUIT_BREAKER': {
        const status = this.strategy.getStatus();
        this.notify.circuitBreaker(status.dailyPnlPct);
        break;
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;

    // Run immediately then on interval
    this.runCycle();
    this._interval = setInterval(() => this.runCycle(), config.engine.cycleMs);
    console.log(`[LCE] 🚀 Engine started`);
  }

  stop() {
    clearInterval(this._interval);
    this.running = false;
    console.log('[LCE] 🛑 Engine stopped');
  }

  getStatus() {
    return {
      ...this.strategy.getStatus(),
      cycleCount: this.cycleCount,
      stats: this.storage.getStats(),
      recentTrades: this.storage.getRecentTrades(5),
    };
  }
}

module.exports = LCEEngine;
