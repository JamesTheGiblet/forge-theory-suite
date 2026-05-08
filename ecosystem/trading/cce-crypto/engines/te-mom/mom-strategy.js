// src/mom-strategy.js
// T.E Momentum — Signal Calculator and Strategy Logic
// 2H candle momentum strategy across BTC, ETH, SOL
// Entry: EMA cross + RSI + Volume + Trend filter
// Exit: Dynamic ATR-based stops and targets

'use strict';

class MOMStrategy {
  constructor(config = {}) {
    this.emaFast     = config.emaFast     || 9;
    this.emaSlow     = config.emaSlow     || 21;
    this.emaTrend    = config.emaTrend    || 50;
    this.rsiPeriod   = config.rsiPeriod   || 14;
    this.rsiEntry    = config.rsiEntry    || 55;
    this.volumeMult  = config.volumeMult  || 1.5;
    this.atrPeriod   = config.atrPeriod   || 14;
    this.atrStopMult = config.atrStopMult || 2.0;
    this.atrTpMult   = config.atrTpMult   || 3.0;
    this.atrTrailMult= config.atrTrailMult|| 1.5;
    this.maxHoldCandles = config.maxHoldCandles || 3;
    this.feeRate     = config.feeRate     || 0.0016;
  }

  // ============================================================================
  // TECHNICAL INDICATORS
  // ============================================================================

  calcEMA(prices, period) {
    if (prices.length < period) return null;
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return +ema.toFixed(8);
  }

  calcRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    const changes = prices.slice(1).map((p, i) => p - prices[i]);
    const gains   = changes.map(c => c > 0 ? c : 0);
    const losses  = changes.map(c => c < 0 ? -c : 0);

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

    for (let i = period; i < changes.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return +(100 - 100 / (1 + rs)).toFixed(2);
  }

  calcATR(candles, period = 14) {
    if (candles.length < period + 1) return null;
    const trs = candles.slice(1).map((c, i) => {
      const prev = candles[i];
      return Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low  - prev.close)
      );
    });

    let atr = trs.slice(0, period).reduce((a, b) => a + b) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }
    return +atr.toFixed(8);
  }

  calcVolumeSMA(volumes, period = 20) {
    if (volumes.length < period) return null;
    const recent = volumes.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / period;
  }

  // ============================================================================
  // SIGNAL GENERATION
  // ============================================================================

  generateSignals(candles) {
    if (candles.length < 60) return null; // need enough history

    const closes  = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const current = candles[candles.length - 1];
    const prev    = candles[candles.length - 2];

    // EMAs
    const emaFast     = this.calcEMA(closes, this.emaFast);
    const emaSlow     = this.calcEMA(closes, this.emaSlow);
    const emaTrend    = this.calcEMA(closes, this.emaTrend);

    // Previous EMAs for cross detection
    const prevEmaFast = this.calcEMA(closes.slice(0, -1), this.emaFast);
    const prevEmaSlow = this.calcEMA(closes.slice(0, -1), this.emaSlow);

    // RSI
    const rsi     = this.calcRSI(closes, this.rsiPeriod);
    const prevRsi = this.calcRSI(closes.slice(0, -1), this.rsiPeriod);

    // ATR
    const atr = this.calcATR(candles, this.atrPeriod);

    // Volume
    const volSMA     = this.calcVolumeSMA(volumes);
    const currentVol = current.volume;

    if (!emaFast || !emaSlow || !emaTrend || !rsi || !atr || !volSMA) return null;

    // Signal conditions
    const bullCross     = prevEmaFast <= prevEmaSlow && emaFast > emaSlow;
    const bearCross     = prevEmaFast >= prevEmaSlow && emaFast < emaSlow;
    const aboveTrend    = current.close > emaTrend;
    const belowTrend    = current.close < emaTrend;
    const rsiBullish    = rsi > this.rsiEntry && rsi > (prevRsi || 0);
    const rsiBearish    = rsi < (100 - this.rsiEntry) && rsi < (prevRsi || 100);
    const volumeConfirm = currentVol > volSMA * this.volumeMult;
    const atrExpanding  = atr > (this.calcATR(candles.slice(0, -5), this.atrPeriod) || 0);
    const feeClear      = atr > current.close * this.feeRate * 3;

    // Entry signals
    const longSignal  = bullCross && aboveTrend && rsiBullish && volumeConfirm && feeClear;
    const shortSignal = false; // Kraken spot only — no shorts

    // Stop and target levels
    const longStop   = +(current.close - atr * this.atrStopMult).toFixed(2);
    const longTarget = +(current.close + atr * this.atrTpMult).toFixed(2);
    const trailLevel = +(current.close + atr * this.atrTrailMult).toFixed(2);

    return {
      timestamp:    new Date().toISOString(),
      price:        current.close,
      emaFast:      +emaFast.toFixed(4),
      emaSlow:      +emaSlow.toFixed(4),
      emaTrend:     +emaTrend.toFixed(4),
      rsi:          +rsi.toFixed(2),
      atr:          +atr.toFixed(4),
      volumeRatio:  +(currentVol / volSMA).toFixed(2),
      bullCross,
      bearCross,
      aboveTrend,
      rsiBullish,
      volumeConfirm,
      atrExpanding,
      feeClear,
      longSignal,
      longStop,
      longTarget,
      trailLevel,
      riskReward:   +((longTarget - current.close) / (current.close - longStop)).toFixed(2)
    };
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  checkExit(position, currentPrice, currentCandle, candlesHeld) {
    const reasons = [];

    // Trailing stop — check FIRST
    // Once price reaches trailLevel, move stop up to entry (free ride)
    // Condition: price hit trail AND stop hasnt been moved up yet
    if (currentPrice >= position.trailLevel && position.stopLoss <= position.entryPrice) {
      return {
        action:  'UPDATE_STOP',
        newStop: position.entryPrice * 1.001,
        reason:  'Trail activated — stop moved to entry (free ride)'
      };
    }

    // Stop loss hit
    if (currentPrice <= position.stopLoss) {
      reasons.push('STOP_LOSS');
    }

    // Take profit hit
    if (currentPrice >= position.takeProfit) {
      reasons.push('TAKE_PROFIT');
    }

    // Time exit — no progress after maxHoldCandles
    if (candlesHeld >= this.maxHoldCandles && currentPrice < position.entryPrice * 1.005) {
      reasons.push('TIME_EXIT');
    }

    if (reasons.length) {
      const pnl = (currentPrice - position.entryPrice) / position.entryPrice * 100;
      return {
        action:   'EXIT',
        reason:   reasons[0],
        exitPrice: currentPrice,
        pnl:      +pnl.toFixed(4)
      };
    }

    return { action: 'HOLD' };
  }

  // Calculate position size based on capital and risk
  calcPositionSize(capital, entryPrice, stopLoss, riskPct = 0.02) {
    const riskAmount = capital * riskPct;
    const riskPerUnit = entryPrice - stopLoss;
    if (riskPerUnit <= 0) return 0;
    const units = riskAmount / riskPerUnit;
    const cost      = units * entryPrice;
    const feeCost   = cost * this.feeRate;
    const totalCost = cost + feeCost;
    // Cap at full capital accounting for fees
    if (totalCost > capital) return +((capital / (1 + this.feeRate)) / entryPrice).toFixed(8);
    return +units.toFixed(8);
  }
}

module.exports = MOMStrategy;
