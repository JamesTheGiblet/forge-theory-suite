// src/cce-forex-engine.js
// CCE Forex Engine — EUR/USD Oversold Fade
// Runs as a second engine inside the same process as CCE Crypto.
// Completely independent capital, state machine, and data feed.
// Shares only the NotificationService (prefixed [FOREX]).

'use strict';

const { ForexSignals, ForexStateMachine } = require('./forex-strategy');
const ForexDataFeed                        = require('./forex-data-feed');
const ForexStorageManager                  = require('./forex-storage');

class CCEForexEngine {
  constructor(config, notifier) {
    this.config    = config;
    this.notifier  = notifier; // Shared with crypto — prefixes all messages with [FOREX]

    this.fsm       = new ForexStateMachine(config.forex?.fsm || {});
    this.signals   = new ForexSignals();
    this.dataFeed  = new ForexDataFeed(config);
    this.storage   = new ForexStorageManager(config.database?.path);

    this.isRunning    = false;
    this.runCount     = 0;
    this.dryRun       = config.forex?.dryRun !== false; // Default: dry run
    this.startingCapital = config.forex?.startingCapital || 300;
    this.portfolioValue  = this.startingCapital;
    this.lastReportValue = this.startingCapital;
  }

  async start(intervalHours = 1) {
    this.isRunning = true;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    await this.storage.init();

    console.log('\n[FOREX] 🚀 Starting CCE Forex Engine');
    console.log(`[FOREX] ⏱️  Check Interval: ${intervalHours}h`);
    console.log(`[FOREX] 💰 Starting Capital: £${this.startingCapital}`);
    console.log(`[FOREX] 🔧 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE ⚠️'}`);
    console.log(`[FOREX] 📍 Pair: EUR/USD | Strategy: Oversold Fade\n`);

    await this.notifier.send(
      `<b>[FOREX] 🚀 CCE Forex Engine Started</b>\nCapital: £${this.startingCapital}\nPair: EUR/USD\nMode: ${this.dryRun ? 'DRY RUN' : '⚠️ LIVE'}`,
      'info'
    );

    while (this.isRunning) {
      await this.runCycle();
      if (!this.isRunning) break;

      const nextRun = new Date(Date.now() + intervalMs);
      console.log(`[FOREX] ⏳ Next run: ${nextRun.toLocaleString()}`);
      await this._sleep(intervalMs);
    }

    console.log('[FOREX] 🛑 Forex engine loop exited.');
  }

  stop() {
    console.log('[FOREX] 🛑 Stopping CCE Forex Engine...');
    this.isRunning = false;
  }

  async runCycle() {
    try {
      this.runCount++;
      console.log(`\n[FOREX] ${'─'.repeat(60)}`);
      console.log(`[FOREX] 🔄 RUN #${this.runCount} — ${new Date().toISOString()}`);
      console.log(`[FOREX]    State: ${this.fsm.currentState} — ${this.fsm.getStateSummary()}`);
      console.log(`[FOREX] ${'─'.repeat(60)}`);

      // 1. Fetch market data
      const market = await this.dataFeed.getMarketData();

      if (market.error) {
        console.warn('[FOREX] ⚠️  Data feed returned error — skipping cycle');
        return;
      }

      // 2. Calculate signals
      const sig = this.signals.getAllSignals(
        market.closes,
        market.price,
        market.hourUTC,
        market.dayOfWeek
      );

      console.log(`[FOREX] 💱 EUR/USD: ${market.price}`);
      console.log(`[FOREX] 📊 Z-Score: ${sig.zScore.toFixed(3)} | RSI: ${sig.rsi.toFixed(1)} | Session: ${sig.session.name}`);
      console.log(`[FOREX] 📅 Day: ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][market.dayOfWeek]} | ATR: ${sig.atr.toFixed(5)}`);

      // 3. Build context
      const context = {
        price:   market.price,
        signals: sig,
        market
      };

      // 4. Evaluate FSM transition
      const transition = this.fsm.evaluateTransition(context);

      if (transition.transitioned) {
        console.log(`\n[FOREX] 📝 STATE: ${transition.from} → ${transition.to}`);
        console.log(`[FOREX]    Reason: ${transition.reason}`);

        await this._handleTransition(transition, market, sig);
      } else {
        console.log(`[FOREX] ✅ State: ${this.fsm.currentState} (no change)`);
      }

      // 5. Log cycle to storage
      const totalReturn = ((this.portfolioValue - this.startingCapital) / this.startingCapital) * 100;
      const dailyReturn = ((this.portfolioValue - this.lastReportValue) / this.lastReportValue) * 100;

      await this.storage.logCycle({
        cycle_number:    this.runCount,
        state:           this.fsm.currentState,
        previous_state:  this.fsm.previousState,
        price:           market.price,
        z_score:         sig.zScore,
        rsi:             sig.rsi,
        atr:             sig.atr,
        session:         sig.session.name,
        portfolio_value: this.portfolioValue,
        daily_return:    dailyReturn,
        total_return:    totalReturn,
        has_position:    !!this.fsm.position
      });

      // 6. Periodic report every 24 cycles (≈ 24 hours at 1H)
      if (this.runCount > 0 && this.runCount % 24 === 0) {
        await this._dailyReport(market.price);
      }

      console.log(`[FOREX] ${'─'.repeat(60)}\n`);

    } catch (err) {
      console.error('[FOREX] ❌ Cycle error:', err.message);
      await this.notifier.send(
        `<b>[FOREX] ⚠️ Cycle Error</b>\n${err.message}`,
        'error'
      );
    }
  }

  // ============================================================================
  // TRANSITION HANDLERS
  // ============================================================================

  async _handleTransition(transition, market, sig) {
    const { from, to, position } = transition;

    switch (to) {

      case 'EXECUTE': {
        // Trade signal — alert for manual execution on Trading 212
        const pos = this.fsm.position;
        const msg = [
          `<b>[FOREX] 🎯 TRADE SIGNAL — EUR/USD</b>`,
          ``,
          `<b>Action:</b> BUY EUR/USD`,
          `<b>Entry:</b>  ${market.price}`,
          `<b>Stop:</b>   ${pos.stopLoss} (−${pos.stopPips} pips)`,
          `<b>Target:</b> ${pos.target} (+${pos.targetPips} pips)`,
          `<b>R:R:</b>    1:2`,
          ``,
          `<b>Signal:</b> Z=${sig.zScore.toFixed(2)}, RSI=${sig.rsi.toFixed(1)}`,
          `<b>Session:</b> ${sig.session.name}`,
          ``,
          `${this.dryRun ? '🔵 DRY RUN — No action needed' : '⚠️ Place trade on Trading 212 NOW'}`
        ].join('\n');

        await this.notifier.send(msg, 'trade');
        console.log(`[FOREX] 📱 Trade alert sent`);
        console.log(`[FOREX]    BUY @ ${market.price} | SL: ${pos.stopLoss} | TP: ${pos.target}`);
        break;
      }

      case 'ANCHOR': {
        // Partial profit alert
        const pos = this.fsm.position;
        const currentPips = Math.round((market.price - pos.entryPrice) * 10000);
        const msg = [
          `<b>[FOREX] ⚓ ANCHOR — Close 50% Now</b>`,
          ``,
          `Current: ${market.price}`,
          `Entry: ${pos.entryPrice}`,
          `Profit so far: +${currentPips} pips`,
          ``,
          `Close half your position to lock in profit.`,
          `Leave remainder running to target: ${pos.target}`,
          ``,
          `${this.dryRun ? '🔵 DRY RUN' : '⚠️ Action on Trading 212'}`
        ].join('\n');

        await this.notifier.send(msg, 'trade');
        console.log(`[FOREX] ⚓ Anchor alert sent — partial close at +${currentPips} pips`);
        break;
      }

      case 'EXTRACT': {
        // Exit alert
        const pos = this.fsm.position;
        if (pos) {
          const resultPips = Math.round((market.price - pos.entryPrice) * 10000);
          const outcome    = resultPips > 0 ? 'WIN' : resultPips < 0 ? 'LOSS' : 'BREAK EVEN';
          const emoji      = resultPips > 0 ? '✅' : resultPips < 0 ? '❌' : '➖';

          const msg = [
            `<b>[FOREX] ${emoji} EXIT TRADE — ${outcome}</b>`,
            ``,
            `Entry: ${pos.entryPrice}`,
            `Exit:  ${market.price}`,
            `Result: ${resultPips > 0 ? '+' : ''}${resultPips} pips`,
            ``,
            `${this.dryRun ? '🔵 DRY RUN' : '⚠️ Close position on Trading 212'}`
          ].join('\n');

          await this.notifier.send(msg, resultPips > 0 ? 'trade' : 'warning');
          console.log(`[FOREX] 🚪 Exit alert: ${outcome} ${resultPips > 0 ? '+' : ''}${resultPips} pips`);

          // Log completed trade
          const holdHours = (Date.now() - pos.entryTime.getTime()) / 3600000;
          await this.storage.logTrade({
            direction:     pos.direction,
            entry_price:   pos.entryPrice,
            stop_loss:     pos.stopLoss,
            target:        pos.target,
            exit_price:    market.price,
            stop_pips:     pos.stopPips,
            target_pips:   pos.targetPips,
            result_pips:   resultPips,
            result_pct:    (resultPips / (pos.entryPrice * 10000)) * 100,
            outcome:       outcome.toLowerCase(),
            partial_close: pos.partialClosed ? 1 : 0,
            hold_hours:    holdHours,
            reason:        transition.reason
          });

          // Update portfolio value (simplified: 1 pip ≈ £0.10 per £300 micro lot)
          const pipValue = (this.portfolioValue / this.startingCapital) * 0.10;
          this.portfolioValue = Math.max(0, this.portfolioValue + resultPips * pipValue);
        }
        break;
      }

      case 'EVALUATE': {
        // Post-trade summary
        const totalReturn = ((this.portfolioValue - this.startingCapital) / this.startingCapital) * 100;
        await this.notifier.send(
          `<b>[FOREX] 📊 Trade Evaluated</b>\nPortfolio: £${this.portfolioValue.toFixed(2)}\nTotal Return: ${totalReturn.toFixed(2)}%`,
          'info'
        );
        break;
      }

      default:
        break;
    }
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  async _dailyReport(currentPrice) {
    const totalReturn = ((this.portfolioValue - this.startingCapital) / this.startingCapital) * 100;
    const periodReturn = ((this.portfolioValue - this.lastReportValue) / this.lastReportValue) * 100;

    const msg = [
      `<b>[FOREX] 📈 24h Report</b>`,
      ``,
      `Portfolio: £${this.portfolioValue.toFixed(2)}`,
      `Period: ${periodReturn >= 0 ? '+' : ''}${periodReturn.toFixed(2)}%`,
      `Total: ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`,
      `EUR/USD: ${currentPrice}`,
      `State: ${this.fsm.currentState}`,
      `Cycles: ${this.runCount}`
    ].join('\n');

    await this.notifier.send(msg, 'report');
    this.lastReportValue = this.portfolioValue;

    await this.storage.saveSnapshot(this.portfolioValue, this.fsm.currentState, currentPrice);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CCEForexEngine;
