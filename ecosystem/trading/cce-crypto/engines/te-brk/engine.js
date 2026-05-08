// src/cce-brk-engine.js
// T.E Breakout — Volatility Squeeze Breakout Engine
// Detects BB squeeze then enters on confirmed breakout with volume
// 1H candles across BTC, ETH, SOL on Kraken

'use strict';

const BRKStrategy      = require('./brk-strategy');
const BRKStorageManager = require('./brk-storage');

const PAIRS = ['BTC/USDC', 'ETH/USDC', 'SOL/USDC'];

class CCEBRKEngine {
  constructor(config, notifier, exchange) {
    this.config    = config;
    this.notifier  = notifier;
    this.exchange  = exchange;
    this.isRunning  = false;
    this.cycleCount = 0;
    this.runCount  = 0;

    const brkCfg = config.brk || {};

    this.dryRun       = brkCfg.dryRun !== false;
    this.capital      = brkCfg.capitalUSDC || 100;
    this.maxPositions = brkCfg.maxPositions || 2;
    this.riskPct      = brkCfg.riskPct || 0.02;
    this.maxDailyLoss = brkCfg.maxDailyLoss || 0.03;
    this.pairs        = brkCfg.pairs || PAIRS;

    this.strategy = new BRKStrategy({
      bbPeriod:      brkCfg.bbPeriod      || 20,
      bbStdDev:      brkCfg.bbStdDev      || 2.0,
      squeezePct:    brkCfg.squeezePct    || 0.02,
      squeezeBars:   brkCfg.squeezeBars   || 6,
      volumeMult:    brkCfg.volumeMult    || 1.8,
      atrPeriod:     brkCfg.atrPeriod     || 14,
      atrStopMult:   brkCfg.atrStopMult   || 1.5,
      atrTpMult:     brkCfg.atrTpMult     || 2.5,
      maxHoldBars:   brkCfg.maxHoldBars   || 6,
      feeRate:       brkCfg.feeRate       || 0.0016,
      rsiPeriod:     brkCfg.rsiPeriod     || 14
    });

    this.storage  = new BRKStorageManager(config.database?.path);

    // State
    this.portfolioValue   = this.capital;
    this.positions        = {};
    this.dailyPnL         = 0;
    this.dailyLossBreaker = false;
    this.lastTradeDate    = null;
    this.activeSqueezees  = {}; // track squeezes per pair
  }

  async start(intervalMinutes = 60) {
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    await this.storage.init();

    console.log('\n[BRK] 💥 Starting T.E Breakout Engine');
    console.log(`[BRK] ⏱️  Interval: ${intervalMinutes}min (1H)`);
    console.log(`[BRK] 💰 Capital: $${this.capital} USDC`);
    console.log(`[BRK] 📊 Pairs: ${this.pairs.join(', ')}`);
    console.log(`[BRK] 🔧 Mode: ${this.dryRun ? 'DRY RUN' : '⚠️ LIVE'}\n`);

    await this.notifier.send([
      `<b>[BRK] 💥 Breakout Engine Started</b>`,
      `Capital: $${this.capital} USDC`,
      `Pairs: ${this.pairs.join(', ')}`,
      `Timeframe: 1H`,
      `Squeeze: BB width < 2% for 6+ bars`,
      `Mode: ${this.dryRun ? 'DRY RUN' : '⚠️ LIVE'}`
    ].join('\n'), 'info');

    while (this.isRunning) {
      await this._runCycle();
      if (!this.isRunning) break;
      const next = new Date(Date.now() + intervalMs);
      console.log(`[BRK] ⏳ Next cycle: ${next.toLocaleTimeString()}`);
      await this._sleep(intervalMs);
    }
  }

  stop() {
    console.log('[BRK] 🛑 Stopping Breakout Engine...');
    this.isRunning  = false;
    this.cycleCount = 0;
    this.storage.close();
  }

  // ============================================================================
  // MAIN CYCLE
  // ============================================================================

  getState()  { return this.currentState || 'SCANNING'; }

  async runCycle() { return this._runCycle(); }

  async _runCycle() {
    this.cycleCount++;
    try {
      this.runCount++;

      const today = new Date().toDateString();
      if (today !== this.lastTradeDate) {
        this.dailyPnL = 0;
        this.dailyLossBreaker = false;
        this.lastTradeDate = today;
      }

      console.log(`\n[BRK] ${'─'.repeat(50)}`);
      console.log(`[BRK] 💥 Cycle #${this.runCount} | ${new Date().toLocaleTimeString()}`);
      console.log(`[BRK]    Portfolio: $${this.portfolioValue.toFixed(2)} | Positions: ${Object.keys(this.positions).length}/${this.maxPositions}`);

      if (this.dailyLossBreaker) {
        console.log('[BRK] 🛑 Daily loss limit — no new entries');
        return;
      }

      for (const pair of this.pairs) {
        await this._processPair(pair);
        await this._sleep(800);
      }

      console.log(`[BRK] ${'─'.repeat(50)}`);

    } catch (err) {
      console.error('[BRK] ❌ Cycle error:', err.message);
    }
  }

  // ============================================================================
  // PAIR PROCESSING
  // ============================================================================

  async _processPair(pair) {
    try {
      const candles = await this._fetchCandles(pair);
      if (!candles || candles.length < 80) {
        console.log(`[BRK] ⚠️  ${pair}: insufficient data`);
        return;
      }

      const signals = this.strategy.generateSignals(candles);
      if (!signals) return;

      const current = candles[candles.length - 1];

      // Squeeze status indicator
      const squeezeIcon = signals.inSqueeze ? '🔵' : '⚪';
      console.log(`[BRK] ${pair}: $${current.close.toFixed(2)} | BB:${(signals.bbWidth * 100).toFixed(2)}% ${squeezeIcon} | RSI:${signals.rsi} | Vol:${signals.volumeRatio}x`);

      // Track squeeze entry
      if (signals.inSqueeze && !this.activeSqueezees[pair]) {
        this.activeSqueezees[pair] = {
          startTime:     new Date(),
          squeezeHigh:   signals.squeezeHigh,
          squeezeLow:    signals.squeezeLow,
          rangeHeight:   signals.rangeHeight,
          barsInSqueeze: signals.barsInSqueeze
        };
        console.log(`[BRK]    ${pair}: 🔵 Squeeze detected — range $${signals.squeezeLow.toFixed(0)}-$${signals.squeezeHigh.toFixed(0)}`);

        await this.storage.logSqueeze({
          pair,
          squeeze_high:    signals.squeezeHigh,
          squeeze_low:     signals.squeezeLow,
          range_height:    signals.rangeHeight,
          bars_in_squeeze: signals.barsInSqueeze,
          broke_out:       false
        });
      }

      // Squeeze ended without breakout
      if (!signals.inSqueeze && this.activeSqueezees[pair]) {
        console.log(`[BRK]    ${pair}: ⚪ Squeeze resolved without breakout`);
        delete this.activeSqueezees[pair];
      }

      // Manage existing position
      if (this.positions[pair]) {
        await this._managePosition(pair, current.close, signals);
        return;
      }

      // Check constraints
      if (Object.keys(this.positions).length >= this.maxPositions) return;
      const dailyLossPct = Math.abs(this.dailyPnL) / this.capital;
      if (this.dailyPnL < 0 && dailyLossPct >= this.maxDailyLoss) {
        this.dailyLossBreaker = true;
        return;
      }

      // Enter on breakout
      if (signals.bullBreakout && signals.feeClear) {
        await this._enterPosition(pair, current.close, signals);
      }

      // Log cycle
      await this.storage.logCycle({
        run_number:     this.runCount,
        pair,
        price:          current.close,
        bb_width:       signals.bbWidth,
        in_squeeze:     signals.inSqueeze,
        bars_in_squeeze: signals.barsInSqueeze,
        rsi:            signals.rsi,
        atr:            signals.atr,
        volume_ratio:   signals.volumeRatio,
        signal:         signals.bullBreakout ? 'LONG_BREAKOUT' : signals.inSqueeze ? 'SQUEEZE' : 'NONE',
        portfolio_value: this.portfolioValue,
        open_positions: Object.keys(this.positions).length
      });

    } catch (err) {
      console.error(`[BRK] ❌ ${pair} error:`, err.message);
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

    console.log(`\n[BRK] 💥 BREAKOUT ENTRY: ${pair}`);
    console.log(`[BRK]    Price: $${price} | Size: ${size}`);
    console.log(`[BRK]    Stop: $${signals.longStop} | Target: $${signals.longTarget}`);
    console.log(`[BRK]    Measured: $${signals.measuredTarget} | R/R: ${signals.riskReward}:1`);
    console.log(`[BRK]    Squeeze: ${signals.barsInSqueeze} bars | Range: $${signals.rangeHeight.toFixed(0)}`);

    let orderId = null;
    if (!this.dryRun) {
      try {
        const order = await this.exchange.createOrder(pair, 'market', 'buy', size);
        orderId = order.id;
      } catch (err) {
        console.error(`[BRK] ❌ Order failed: ${err.message}`);
        return;
      }
    }

    this.positions[pair] = {
      pair,
      entryPrice:     price,
      size,
      stopLoss:       signals.longStop,
      takeProfit:     signals.longTarget,
      measuredTarget: signals.measuredTarget,
      bbUpper:        signals.bbUpper,
      barsHeld:       0,
      squeezeHigh:    signals.squeezeHigh,
      squeezeLow:     signals.squeezeLow,
      rangeHeight:    signals.rangeHeight,
      squeezeBars:    signals.barsInSqueeze,
      entryRsi:       signals.rsi,
      entryAtr:       signals.atr,
      volumeRatio:    signals.volumeRatio,
      orderId,
      entryTime:      new Date()
    };

    // Clear squeeze tracker
    delete this.activeSqueezees[pair];

    await this.notifier.send([
      `<b>[BRK] 💥 Breakout Entry</b>`,
      ``,
      `Pair: ${pair}`,
      `Entry: $${price.toFixed(2)}`,
      `Size: ${size}`,
      ``,
      `Stop:     $${signals.longStop.toFixed(2)}`,
      `Target:   $${signals.longTarget.toFixed(2)}`,
      `Measured: $${signals.measuredTarget?.toFixed(2) || '--'}`,
      `R/R: ${signals.riskReward}:1`,
      ``,
      `Squeeze: ${signals.barsInSqueeze} bars`,
      `Range height: $${signals.rangeHeight.toFixed(0)}`,
      `RSI: ${signals.rsi} | Vol: ${signals.volumeRatio}x`,
      `Mode: ${this.dryRun ? 'DRY RUN' : '⚠️ LIVE'}`
    ].join('\n'), 'trade');
  }

  async _managePosition(pair, currentPrice, signals) {
    const pos = this.positions[pair];
    pos.barsHeld++;

    const exitCheck = this.strategy.checkExit(pos, currentPrice, pos.barsHeld);

    if (exitCheck.action === 'EXIT') {
      await this._exitPosition(pair, currentPrice, exitCheck.reason);
    } else {
      console.log(`[BRK]    ${pair}: HOLDING | $${currentPrice.toFixed(2)} | PnL: ${exitCheck.unrealised >= 0 ? '+' : ''}${exitCheck.unrealised}% | Bars: ${pos.barsHeld}`);
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

    console.log(`\n[BRK] ${netPnl >= 0 ? '💰' : '🔴'} EXIT: ${pair} | ${reason}`);
    console.log(`[BRK]    $${pos.entryPrice.toFixed(2)} → $${exitPrice.toFixed(2)} | PnL: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(4)}`);

    if (!this.dryRun) {
      try {
        await this.exchange.createOrder(pair, 'market', 'sell', pos.size);
      } catch (err) {
        console.error(`[BRK] ❌ Exit order failed: ${err.message}`);
      }
    }

    await this.storage.logTrade({
      pair,
      side:            'long',
      entry_price:     pos.entryPrice,
      exit_price:      exitPrice,
      size:            pos.size,
      capital_used:    pos.entryPrice * pos.size,
      stop_loss:       pos.stopLoss,
      take_profit:     pos.takeProfit,
      measured_target: pos.measuredTarget,
      exit_reason:     reason,
      pnl_pct:         +pnlPct.toFixed(4),
      pnl_usdc:        +netPnl.toFixed(6),
      bars_held:       pos.barsHeld,
      squeeze_bars:    pos.squeezeBars,
      range_height:    pos.rangeHeight,
      rsi_at_entry:    pos.entryRsi,
      atr_at_entry:    pos.entryAtr,
      volume_ratio:    pos.volumeRatio,
      order_id:        pos.orderId,
      dry_run:         this.dryRun
    });

    await this.notifier.send([
      `<b>[BRK] ${netPnl >= 0 ? '💰' : '🔴'} Breakout Exit</b>`,
      ``,
      `Pair: ${pair} | ${reason}`,
      `Entry: $${pos.entryPrice.toFixed(2)} → Exit: $${exitPrice.toFixed(2)}`,
      `PnL: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(4)} (${pnlPct.toFixed(2)}%)`,
      `Portfolio: $${this.portfolioValue.toFixed(2)}`
    ].join('\n'), netPnl >= 0 ? 'trade' : 'error');

    delete this.positions[pair];
  }

  // ============================================================================
  // DATA FEED — 1H candles via Kraken public API
  // ============================================================================

  async _fetchCandles(pair) {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(pair, '1h');
      if (ohlcv && ohlcv.length) {
        return ohlcv.map(c => ({
          timestamp: c[0], open: c[1], high: c[2],
          low: c[3], close: c[4], volume: c[5]
        }));
      }
    } catch (e) {}

    // Fallback: Kraken public API
    try {
      const https  = require('https');
      const symbol = pair === 'BTC/USDC' ? 'XBTUSDC'
                   : pair === 'ETH/USDC' ? 'ETHUSDC'
                   : pair === 'SOL/USDC' ? 'SOLUSDC' : null;
      if (!symbol) return null;

      const body = await new Promise((resolve, reject) => {
        const url = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=60`;
        https.get(url, { headers: { 'User-Agent': 'CCE-BRK/1.0' } }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });

      const d      = JSON.parse(body);
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
      console.error(`[BRK] ❌ Candle fetch failed ${pair}:`, e.message);
      return null;
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      runCount:        this.runCount,
      portfolioValue:  this.portfolioValue,
      openPositions:   Object.keys(this.positions || {}).length,
      activeSqueezees: Object.keys(this.activeSqueezees || {}).length,
      dailyPnL:        this.dailyPnL,
      isRunning:       this.isRunning
    };
  }
}

module.exports = CCEBRKEngine;
