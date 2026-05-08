// src/cce-mom-engine.js
// T.E Momentum — 2H Momentum Trading Engine
// Trades BTC/USDC, ETH/USDC, SOL/USDC on Kraken
// Entry: EMA cross + RSI + Volume + Trend filter
// Exit:  Dynamic ATR stops, targets, and trailing

'use strict';

const MOMStrategy      = require('./mom-strategy');
const MOMStorageManager = require('./mom-storage');

const PAIRS = ['BTC/USDC', 'ETH/USDC', 'SOL/USDC'];

class CCEMOMEngine {
  constructor(config, notifier, exchange) {
    this.config    = config;
    this.notifier  = notifier;
    this.exchange  = exchange;
    this.isRunning  = false;
    this.cycleCount = 0;
    this.runCount  = 0;

    const momCfg = config.mom || {};

    this.dryRun      = momCfg.dryRun !== false;
    this.capital     = momCfg.capitalUSDC || 125;
    this.maxPositions = momCfg.maxPositions || 2;
    this.riskPct     = momCfg.riskPct || 0.02;
    this.maxDailyLoss = momCfg.maxDailyLoss || 0.03;
    this.cooldownCandles = momCfg.cooldownCandles || 2;
    this.pairs       = momCfg.pairs || PAIRS;

    this.strategy = new MOMStrategy({
      emaFast:      momCfg.emaFast      || 9,
      emaSlow:      momCfg.emaSlow      || 21,
      emaTrend:     momCfg.emaTrend     || 50,
      rsiPeriod:    momCfg.rsiPeriod    || 14,
      rsiEntry:     momCfg.rsiEntry     || 55,
      volumeMult:   momCfg.volumeMult   || 1.5,
      atrPeriod:    momCfg.atrPeriod    || 14,
      atrStopMult:  momCfg.atrStopMult  || 2.0,
      atrTpMult:    momCfg.atrTpMult    || 3.0,
      atrTrailMult: momCfg.atrTrailMult || 1.5,
      maxHoldCandles: momCfg.maxHoldCandles || 3,
      feeRate:      momCfg.feeRate      || 0.0016
    });

    this.storage   = new MOMStorageManager(config.database?.path);

    // State
    this.portfolioValue = this.capital;
    this.positions      = {}; // { pair: position }
    this.cooldowns      = {}; // { pair: candlesRemaining }
    this.dailyPnL       = 0;
    this.dailyLossBreaker = false;
    this.candleCache    = {}; // { pair: candles[] }
    this.lastTradeDate  = null;
  }

  async start(intervalMinutes = 120) {
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    await this.storage.init();

    console.log('\n[MOM] 📈 Starting T.E Momentum Engine');
    console.log(`[MOM] ⏱️  Interval: ${intervalMinutes}min (2H)`);
    console.log(`[MOM] 💰 Capital: $${this.capital} USDC`);
    console.log(`[MOM] 📊 Pairs: ${this.pairs.join(', ')}`);
    console.log(`[MOM] 🔧 Mode: ${this.dryRun ? 'DRY RUN' : '⚠️ LIVE'}\n`);

    await this.notifier.send([
      `<b>[MOM] 📈 Momentum Engine Started</b>`,
      `Capital: $${this.capital} USDC`,
      `Pairs: ${this.pairs.join(', ')}`,
      `Timeframe: 2H`,
      `Max positions: ${this.maxPositions}`,
      `Mode: ${this.dryRun ? 'DRY RUN' : '⚠️ LIVE'}`
    ].join('\n'), 'info');

    while (this.isRunning) {
      await this._runCycle();
      if (!this.isRunning) break;

      const next = new Date(Date.now() + intervalMs);
      console.log(`[MOM] ⏳ Next cycle: ${next.toLocaleTimeString()}`);
      await this._sleep(intervalMs);
    }
  }

  stop() {
    console.log('[MOM] 🛑 Stopping Momentum Engine...');
    this.isRunning  = false;
    this.cycleCount = 0;
    this.storage.close();
  }

  // ============================================================================
  // MAIN CYCLE
  // ============================================================================

  getState()  { return this.currentState || 'STANDBY'; }

  async runCycle() { return this._runCycle(); }

  async _runCycle() {
    this.cycleCount++;
    try {
      this.runCount++;

      // Reset daily PnL at midnight
      const today = new Date().toDateString();
      if (today !== this.lastTradeDate) {
        this.dailyPnL = 0;
        this.dailyLossBreaker = false;
        this.lastTradeDate = today;
      }

      console.log(`\n[MOM] ${'─'.repeat(50)}`);
      console.log(`[MOM] 🔄 Cycle #${this.runCount} | ${new Date().toLocaleTimeString()}`);
      console.log(`[MOM]    Portfolio: $${this.portfolioValue.toFixed(2)} | Positions: ${Object.keys(this.positions).length}/${this.maxPositions}`);
      console.log(`[MOM]    Daily PnL: ${this.dailyPnL >= 0 ? '+' : ''}$${this.dailyPnL.toFixed(4)}`);

      // Daily loss circuit breaker
      if (this.dailyLossBreaker) {
        console.log('[MOM] 🛑 Daily loss limit hit — no new entries today');
        return;
      }

      // Process each pair
      for (const pair of this.pairs) {
        await this._processPair(pair);
        await this._sleep(1000); // small delay between pairs
      }

      console.log(`[MOM] ${'─'.repeat(50)}`);

    } catch (err) {
      console.error('[MOM] ❌ Cycle error:', err.message);
    }
  }

  // ============================================================================
  // PAIR PROCESSING
  // ============================================================================

  async _processPair(pair) {
    try {
      // Fetch 2H candles
      const candles = await this._fetchCandles(pair);
      if (!candles || candles.length < 60) {
        console.log(`[MOM] ⚠️  ${pair}: insufficient candle data`);
        return;
      }

      this.candleCache[pair] = candles;
      const current = candles[candles.length - 1];
      const signals = this.strategy.generateSignals(candles);

      if (!signals) return;

      console.log(`[MOM] ${pair}: $${current.close.toFixed(2)} | RSI:${signals.rsi} | Vol:${signals.volumeRatio}x | EMA${signals.bullCross ? '↑' : signals.bearCross ? '↓' : '-'}`);

      // 1. Check existing position
      if (this.positions[pair]) {
        await this._managePosition(pair, current.close, signals);
        return;
      }

      // 2. Check cooldown
      if (this.cooldowns[pair] > 0) {
        this.cooldowns[pair]--;
        console.log(`[MOM]    ${pair}: cooling down (${this.cooldowns[pair]} candles remaining)`);
        return;
      }

      // 3. Check max positions
      if (Object.keys(this.positions).length >= this.maxPositions) {
        console.log(`[MOM]    ${pair}: max positions reached (${this.maxPositions})`);
        return;
      }

      // 4. Check daily loss limit
      const dailyLossPct = Math.abs(this.dailyPnL) / this.capital;
      if (this.dailyPnL < 0 && dailyLossPct >= this.maxDailyLoss) {
        console.log(`[MOM]    Daily loss limit reached — no new entries`);
        this.dailyLossBreaker = true;
        return;
      }

      // 5. Check entry signal
      if (signals.longSignal) {
        await this._enterPosition(pair, current.close, signals);
      } else {
        // Log signal data even if not entering
        await this.storage.logCycle({
          run_number:     this.runCount,
          pair,
          price:          current.close,
          ema_fast:       signals.emaFast,
          ema_slow:       signals.emaSlow,
          ema_trend:      signals.emaTrend,
          rsi:            signals.rsi,
          atr:            signals.atr,
          volume_ratio:   signals.volumeRatio,
          signal:         'NONE',
          portfolio_value: this.portfolioValue,
          open_positions: Object.keys(this.positions).length
        });
      }

    } catch (err) {
      console.error(`[MOM] ❌ ${pair} error:`, err.message);
    }
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  async _enterPosition(pair, price, signals) {
    const capitalPerPair = this.portfolioValue / this.pairs.length;
    const size = this.strategy.calcPositionSize(
      capitalPerPair, price, signals.longStop, this.riskPct
    );

    if (size <= 0) return;

    console.log(`\n[MOM] 🟢 ENTRY: ${pair}`);
    console.log(`[MOM]    Price: $${price} | Size: ${size}`);
    console.log(`[MOM]    Stop: $${signals.longStop} | Target: $${signals.longTarget}`);
    console.log(`[MOM]    R/R: ${signals.riskReward}:1 | RSI: ${signals.rsi}`);

    let orderId = null;

    if (!this.dryRun) {
      try {
        const order = await this.exchange.createOrder(
          pair, 'market', 'buy', size
        );
        orderId = order.id;
      } catch (err) {
        console.error(`[MOM] ❌ Order failed: ${err.message}`);
        return;
      }
    }

    // Record position
    this.positions[pair] = {
      pair,
      entryPrice:  price,
      size,
      stopLoss:    signals.longStop,
      takeProfit:  signals.longTarget,
      trailLevel:  signals.trailLevel,
      trailActive: false,
      candlesHeld: 0,
      entryRsi:    signals.rsi,
      entryAtr:    signals.atr,
      volumeRatio: signals.volumeRatio,
      orderId,
      entryTime:   new Date()
    };

    await this.storage.logSignal({
      pair,
      signal_type: 'LONG_ENTRY',
      price,
      rsi:          signals.rsi,
      atr:          signals.atr,
      volume_ratio: signals.volumeRatio,
      stop_loss:    signals.longStop,
      take_profit:  signals.longTarget,
      risk_reward:  signals.riskReward,
      acted_on:     true
    });

    await this.notifier.send([
      `<b>[MOM] 🟢 Position Opened</b>`,
      ``,
      `Pair: ${pair}`,
      `Entry: $${price.toFixed(2)}`,
      `Size: ${size}`,
      ``,
      `Stop:   $${signals.longStop.toFixed(2)}`,
      `Target: $${signals.longTarget.toFixed(2)}`,
      `Trail:  $${signals.trailLevel.toFixed(2)}`,
      `R/R:    ${signals.riskReward}:1`,
      ``,
      `RSI: ${signals.rsi} | Vol: ${signals.volumeRatio}x`,
      `Mode: ${this.dryRun ? 'DRY RUN' : '⚠️ LIVE'}`
    ].join('\n'), 'trade');
  }

  async _managePosition(pair, currentPrice, signals) {
    const pos = this.positions[pair];
    pos.candlesHeld++;

    const exitCheck = this.strategy.checkExit(pos, currentPrice, null, pos.candlesHeld);

    if (exitCheck.action === 'UPDATE_STOP') {
      // Move stop to entry — free ride activated
      console.log(`[MOM] 🔒 ${pair}: Trail activated — stop moved to entry $${pos.entryPrice}`);
      pos.stopLoss    = pos.entryPrice;
      pos.trailActive = true;

      await this.notifier.send([
        `<b>[MOM] 🔒 Trail Activated</b>`,
        `${pair} — stop moved to entry`,
        `Entry: $${pos.entryPrice.toFixed(2)}`,
        `Current: $${currentPrice.toFixed(2)}`,
        `Free ride active ✅`
      ].join('\n'), 'info');
      return;
    }

    if (exitCheck.action === 'EXIT') {
      await this._exitPosition(pair, currentPrice, exitCheck.reason);
    } else {
      const unrealised = (currentPrice - pos.entryPrice) / pos.entryPrice * 100;
      console.log(`[MOM]    ${pair}: HOLDING | Price: $${currentPrice.toFixed(2)} | PnL: ${unrealised >= 0 ? '+' : ''}${unrealised.toFixed(2)}% | Candles: ${pos.candlesHeld}`);
    }
  }

  async _exitPosition(pair, exitPrice, reason) {
    const pos = this.positions[pair];
    if (!pos) return;

    const grossPnl = (exitPrice - pos.entryPrice) * pos.size;
    const fees     = exitPrice * pos.size * this.strategy.feeRate * 2;
    const netPnl   = grossPnl - fees;
    const pnlPct   = (exitPrice - pos.entryPrice) / pos.entryPrice * 100;

    this.portfolioValue += netPnl;
    this.dailyPnL       += netPnl;

    console.log(`\n[MOM] ${netPnl >= 0 ? '💰' : '🔴'} EXIT: ${pair}`);
    console.log(`[MOM]    Reason: ${reason}`);
    console.log(`[MOM]    Entry: $${pos.entryPrice.toFixed(2)} → Exit: $${exitPrice.toFixed(2)}`);
    console.log(`[MOM]    PnL: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(4)} (${pnlPct.toFixed(2)}%)`);

    if (!this.dryRun) {
      try {
        await this.exchange.createOrder(pair, 'market', 'sell', pos.size);
      } catch (err) {
        console.error(`[MOM] ❌ Exit order failed: ${err.message}`);
      }
    }

    await this.storage.logTrade({
      pair,
      side:         'long',
      entry_price:  pos.entryPrice,
      exit_price:   exitPrice,
      size:         pos.size,
      capital_used: pos.entryPrice * pos.size,
      stop_loss:    pos.stopLoss,
      take_profit:  pos.takeProfit,
      trail_level:  pos.trailLevel,
      exit_reason:  reason,
      pnl_pct:      +pnlPct.toFixed(4),
      pnl_usdc:     +netPnl.toFixed(6),
      candles_held: pos.candlesHeld,
      rsi_at_entry: pos.entryRsi,
      atr_at_entry: pos.entryAtr,
      volume_ratio: pos.volumeRatio,
      order_id:     pos.orderId,
      dry_run:      this.dryRun
    });

    await this.notifier.send([
      `<b>[MOM] ${netPnl >= 0 ? '💰' : '🔴'} Position Closed</b>`,
      ``,
      `Pair: ${pair}`,
      `Reason: ${reason}`,
      ``,
      `Entry: $${pos.entryPrice.toFixed(2)}`,
      `Exit:  $${exitPrice.toFixed(2)}`,
      ``,
      `PnL: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(4)} (${pnlPct.toFixed(2)}%)`,
      `Portfolio: $${this.portfolioValue.toFixed(2)}`,
      `Daily PnL: ${this.dailyPnL >= 0 ? '+' : ''}$${this.dailyPnL.toFixed(4)}`
    ].join('\n'), netPnl >= 0 ? 'trade' : 'error');

    delete this.positions[pair];

    // Set cooldown after loss
    if (netPnl < 0) {
      this.cooldowns[pair] = this.cooldownCandles;
    }
  }

  // ============================================================================
  // DATA FEED
  // ============================================================================

  async _fetchCandles(pair) {
    try {
      // Map pair to Kraken OHLCV format
      const krakenPair = pair.replace('/', '');
      const sinceMs    = Date.now() - (120 * 120 * 60 * 1000); // 120 candles of 2H
      const since      = Math.floor(sinceMs / 1000);

      const ohlcv = await this.exchange.fetchOHLCV(pair, '60', undefined, 200);
      if (!ohlcv || !ohlcv.length) return null;

      return ohlcv.map(c => ({
        timestamp: c[0],
        open:      c[1],
        high:      c[2],
        low:       c[3],
        close:     c[4],
        volume:    c[5]
      }));
    } catch (err) {
      // Fallback: use Kraken public API directly
      try {
        const https = require('https');
        const symbol = pair === 'BTC/USDC' ? 'XBTUSDC'
                     : pair === 'ETH/USDC' ? 'ETHUSDC'
                     : pair === 'SOL/USDC' ? 'SOLUSDC' : null;
        if (!symbol) return null;

        const body = await new Promise((resolve, reject) => {
          const url = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=60`;
          https.get(url, { headers: { 'User-Agent': 'CCE-MOM/1.0' } }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
          }).on('error', reject);
        });

        const d = JSON.parse(body);
        const result = Object.values(d.result || {})[0];
        if (!result) return null;

        return result.map(c => ({
          timestamp: c[0] * 1000,
          open:      parseFloat(c[1]),
          high:      parseFloat(c[2]),
          low:       parseFloat(c[3]),
          close:     parseFloat(c[4]),
          volume:    parseFloat(c[6])
        }));
      } catch (e) {
        console.error(`[MOM] ❌ Candle fetch failed for ${pair}:`, e.message);
        return null;
      }
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      runCount:       this.runCount,
      portfolioValue: this.portfolioValue,
      openPositions:  Object.keys(this.positions || {}).length,
      positions:      this.positions || {},
      dailyPnL:       this.dailyPnL,
      isRunning:      this.isRunning
    };
  }
}

module.exports = CCEMOMEngine;
