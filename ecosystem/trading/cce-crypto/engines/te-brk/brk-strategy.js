// src/brk-strategy.js
// T.E Breakout — Volatility Squeeze and Breakout Signal Engine
// Detects Bollinger Band squeeze then enters on confirmed breakout
// Works on 1H candles across BTC, ETH, SOL

'use strict';

class BRKStrategy {
  constructor(config = {}) {
    this.bbPeriod      = config.bbPeriod      || 20;   // Bollinger Band period
    this.bbStdDev      = config.bbStdDev      || 2.0;  // Standard deviations
    this.squeezePct    = config.squeezePct    || 0.02; // Band width < 2% = squeeze
    this.squeezeBars   = config.squeezeBars   || 6;    // Min bars in squeeze
    this.volumeMult    = config.volumeMult    || 1.8;  // Volume expansion for breakout
    this.atrPeriod     = config.atrPeriod     || 14;
    this.atrStopMult   = config.atrStopMult   || 1.5;  // Tighter stop than momentum
    this.atrTpMult     = config.atrTpMult     || 2.5;  // Target = range height
    this.maxHoldBars   = config.maxHoldBars   || 6;    // 6 hours max hold
    this.feeRate       = config.feeRate       || 0.0016;
    this.rsiPeriod     = config.rsiPeriod     || 14;
    this.rsiOverbought = config.rsiOverbought || 70;
    this.rsiOversold   = config.rsiOversold   || 30;
  }

  // ============================================================================
  // INDICATORS
  // ============================================================================

  calcBollingerBands(prices, period, stdDevMult) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    const sma   = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, p) => s + Math.pow(p - sma, 2), 0) / period;
    const stdDev   = Math.sqrt(variance);
    return {
      upper:  +(sma + stdDevMult * stdDev).toFixed(4),
      middle: +sma.toFixed(4),
      lower:  +(sma - stdDevMult * stdDev).toFixed(4),
      width:  +((stdDevMult * 2 * stdDev) / sma).toFixed(6),
      stdDev: +stdDev.toFixed(4)
    };
  }

  calcATR(candles, period) {
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

  calcRSI(prices, period) {
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
    return +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2);
  }

  calcVolumeSMA(volumes, period = 20) {
    if (volumes.length < period) return null;
    const recent = volumes.slice(-period);
    return recent.reduce((a, b) => a + b, 0) / period;
  }

  // ============================================================================
  // SQUEEZE DETECTION
  // ============================================================================

  detectSqueeze(candles) {
    if (candles.length < this.bbPeriod + this.squeezeBars) return null;

    const widths = [];
    for (let i = this.squeezeBars; i > 0; i--) {
      const slice  = candles.slice(-(this.bbPeriod + i), candles.length - i + 1);
      const prices = slice.map(c => c.close);
      const bb     = this.calcBollingerBands(prices, this.bbPeriod, this.bbStdDev);
      if (bb) widths.push(bb.width);
    }

    if (widths.length < this.squeezeBars) return null;

    // All recent bars must have narrow bands
    const allNarrow = widths.every(w => w < this.squeezePct);
    const avgWidth  = widths.reduce((a, b) => a + b, 0) / widths.length;

    // Range of the squeeze — for measuring the breakout target
    const squeezeCandles = candles.slice(-(this.squeezeBars + this.bbPeriod));
    const squeezeHigh    = Math.max(...squeezeCandles.slice(-this.squeezeBars).map(c => c.high));
    const squeezeLow     = Math.min(...squeezeCandles.slice(-this.squeezeBars).map(c => c.low));
    const rangeHeight    = squeezeHigh - squeezeLow;

    return {
      inSqueeze:   allNarrow,
      avgWidth:    +avgWidth.toFixed(6),
      squeezeHigh,
      squeezeLow,
      rangeHeight: +rangeHeight.toFixed(4),
      barsInSqueeze: widths.filter(w => w < this.squeezePct).length
    };
  }

  // ============================================================================
  // BREAKOUT SIGNAL
  // ============================================================================

  generateSignals(candles) {
    if (candles.length < 80) return null;

    const closes  = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const current = candles[candles.length - 1];
    const prev    = candles[candles.length - 2];

    // Current Bollinger Bands
    const bb     = this.calcBollingerBands(closes, this.bbPeriod, this.bbStdDev);
    const atr    = this.calcATR(candles, this.atrPeriod);
    const rsi    = this.calcRSI(closes, this.rsiPeriod);
    const volSMA = this.calcVolumeSMA(volumes);

    if (!bb || !atr || !rsi || !volSMA) return null;

    // Squeeze detection
    const squeeze = this.detectSqueeze(candles);
    if (!squeeze) return null;

    // Breakout conditions
    const bullBreakout = (
      squeeze.inSqueeze &&
      current.close > bb.upper &&           // Price breaks above upper band
      prev.close <= bb.upper &&             // Previous bar was inside
      current.volume > volSMA * this.volumeMult && // Volume expansion
      rsi > 50 && rsi < this.rsiOverbought  // RSI confirming but not extreme
    );

    const bearBreakout = false; // Spot only — no shorts

    // Measured move target (range height projected from breakout)
    const measuredTarget = bullBreakout
      ? +(current.close + squeeze.rangeHeight).toFixed(2)
      : null;

    // ATR-based target (use larger of measured move and ATR target)
    const atrTarget  = +(current.close + atr * this.atrTpMult).toFixed(2);
    const longTarget = measuredTarget
      ? Math.max(measuredTarget, atrTarget)
      : atrTarget;

    const longStop = +(current.close - atr * this.atrStopMult).toFixed(2);
    const riskReward = +((longTarget - current.close) / (current.close - longStop)).toFixed(2);
    const feeClear   = atr > current.close * this.feeRate * 3;

    return {
      timestamp:      new Date().toISOString(),
      price:          current.close,
      bbUpper:        bb.upper,
      bbMiddle:       bb.middle,
      bbLower:        bb.lower,
      bbWidth:        bb.width,
      rsi:            +rsi.toFixed(2),
      atr:            +atr.toFixed(4),
      volumeRatio:    +(current.volume / volSMA).toFixed(2),
      inSqueeze:      squeeze.inSqueeze,
      barsInSqueeze:  squeeze.barsInSqueeze,
      squeezeHigh:    squeeze.squeezeHigh,
      squeezeLow:     squeeze.squeezeLow,
      rangeHeight:    squeeze.rangeHeight,
      bullBreakout,
      longStop,
      longTarget,
      measuredTarget,
      riskReward,
      feeClear
    };
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  checkExit(position, currentPrice, barsHeld) {
    // Stop loss
    if (currentPrice <= position.stopLoss) {
      return { action: 'EXIT', reason: 'STOP_LOSS', exitPrice: currentPrice };
    }

    // Take profit
    if (currentPrice >= position.takeProfit) {
      return { action: 'EXIT', reason: 'TAKE_PROFIT', exitPrice: currentPrice };
    }

    // Breakout failure — price falls back inside bands
    if (currentPrice < position.bbUpper && barsHeld >= 2) {
      return { action: 'EXIT', reason: 'BREAKOUT_FAILURE', exitPrice: currentPrice };
    }

    // Time exit
    if (barsHeld >= this.maxHoldBars) {
      return { action: 'EXIT', reason: 'TIME_EXIT', exitPrice: currentPrice };
    }

    const unrealised = (currentPrice - position.entryPrice) / position.entryPrice * 100;
    return { action: 'HOLD', unrealised: +unrealised.toFixed(3) };
  }

  calcPositionSize(capital, entryPrice, stopLoss, riskPct = 0.02) {
    const riskAmount  = capital * riskPct;
    const riskPerUnit = entryPrice - stopLoss;
    if (riskPerUnit <= 0) return 0;
    const units = riskAmount / riskPerUnit;
    const cost      = units * entryPrice;
    const feeCost   = cost * this.feeRate;
    const totalCost = cost + feeCost;
    if (totalCost > capital) return +((capital / (1 + this.feeRate)) / entryPrice).toFixed(8);
    return +units.toFixed(8);
  }
}

module.exports = BRKStrategy;
