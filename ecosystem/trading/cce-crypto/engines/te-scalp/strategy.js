// engines/te-scalp/strategy.js
// T.E Scalp — RSI + Volume FSM
'use strict';

const STATE = {
  IDLE:     'IDLE',
  STALKING: 'STALKING',
  ENTRY:    'ENTRY',
  RIDING:   'RIDING',
  EXIT:     'EXIT',
  STOPPED:  'STOPPED'
};

class TeScalpStrategy {

  constructor(config = {}) {
    this.rsiOversold    = config.rsiOversold    || 32;   // RSI oversold threshold
    this.rsiOverbought  = config.rsiOverbought  || 68;   // RSI overbought exit
    this.volumeSpike    = config.volumeSpike    || 1.5;  // Volume must be 1.5x avg
    this.targetPct      = config.targetPct      || 0.8;  // Take profit at +0.8%
    this.stopPct        = config.stopPct        || -0.5; // Stop loss at -0.5%
    this.maxHoldCandles = config.maxHoldCandles || 6;    // Max 6 x 5min = 30 min
    this.cooldownCandles = config.cooldownCandles || 3;  // Wait 3 candles after trade
  }

  evaluate(currentState, signals) {
    if (currentState === STATE.STOPPED) return STATE.STOPPED;

    switch (currentState) {

      case STATE.IDLE:
        // Start stalking when RSI approaches oversold
        if (signals.rsi <= this.rsiOversold + 5 && signals.cooldownDone) return STATE.STALKING;
        return STATE.IDLE;

      case STATE.STALKING:
        // Enter on RSI oversold + volume spike confirmation
        if (signals.rsi <= this.rsiOversold && signals.volumeSpike) return STATE.ENTRY;
        // Also enter on RSI divergence (price lower, RSI higher)
        if (signals.bullishDivergence && signals.volumeSpike) return STATE.ENTRY;
        // Give up if RSI recovers without entry
        if (signals.rsi > this.rsiOversold + 8) return STATE.IDLE;
        return STATE.STALKING;

      case STATE.ENTRY:
        return STATE.RIDING;

      case STATE.RIDING:
        // Take profit
        if (signals.pnlPct >= this.targetPct) return STATE.EXIT;
        // Stop loss
        if (signals.pnlPct <= this.stopPct) return STATE.EXIT;
        // RSI overbought — momentum exhausted
        if (signals.rsi >= this.rsiOverbought) return STATE.EXIT;
        // Time stop
        if (signals.candlesHeld >= this.maxHoldCandles) return STATE.EXIT;
        return STATE.RIDING;

      case STATE.EXIT:
        return STATE.IDLE;

      default:
        return STATE.IDLE;
    }
  }
}

module.exports = TeScalpStrategy;
