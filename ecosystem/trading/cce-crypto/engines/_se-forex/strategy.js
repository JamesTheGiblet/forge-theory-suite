// engines/se-forex/strategy.js
// CCE Core Framework — SE Forex Strategy
// Oversold Fade: enter when EUR/USD is statistically oversold in a good session

'use strict';

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  ACTIVE:   'ACTIVE',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class SeForexStrategy {

  constructor(config = {}) {
    this.zScoreEntry    = config.zScoreEntry    || -1.5;  // Z-score to start watching
    this.zScoreActive   = config.zScoreActive   || -2.0;  // Z-score to go active
    this.rsiOversold    = config.rsiOversold    || 35;    // RSI oversold threshold
    this.rsiNeutral     = config.rsiNeutral     || 50;    // RSI neutral (exit watch)
    this.trendThreshold = config.trendThreshold || -0.005; // 7d trend max for fade
  }

  evaluate(currentState, signals, data) {
    if (currentState === STATE.STOPPED) return STATE.STOPPED;

    switch (currentState) {

      case STATE.DORMANT:
        if (this._entryConditionBuilding(signals)) return STATE.WATCHING;
        return STATE.DORMANT;

      case STATE.WATCHING:
        if (this._entryConditionMet(signals)) return STATE.ACTIVE;
        if (this._conditionsDeteriorated(signals)) return STATE.DORMANT;
        return STATE.WATCHING;

      case STATE.ACTIVE:
        if (this._exitConditionMet(signals, data)) return STATE.EXITING;
        return STATE.ACTIVE;

      case STATE.EXITING:
        return STATE.DORMANT;

      default:
        return STATE.DORMANT;
    }
  }

  // Conditions starting to build — not yet strong enough to trade
  _entryConditionBuilding(signals) {
    return (
      signals.zScore < this.zScoreEntry &&   // Starting to become oversold
      signals.rsi < 45 &&                    // RSI weakening
      signals.goodSession                    // Only trade in London/NY
    );
  }

  // All conditions aligned — deploy capital
  _entryConditionMet(signals) {
    return (
      signals.zScore < this.zScoreActive &&  // Strongly oversold
      signals.rsi < this.rsiOversold &&      // RSI confirms oversold
      signals.goodSession &&                 // Active session
      !signals.aboveSma20                    // Price below 20 SMA (confirming downmove)
    );
  }

  // Conditions broken down — retreat to dormant
  _conditionsDeteriorated(signals) {
    return (
      signals.zScore > -0.5 ||              // Z-score recovered
      signals.rsi > this.rsiNeutral ||      // RSI recovered
      !signals.goodSession                  // Session ended
    );
  }

  // Exit the position
  _exitConditionMet(signals, data) {
    return (
      signals.zScore > 0 ||                 // Mean reversion complete
      signals.rsi > 60 ||                   // RSI overbought
      !signals.goodSession                  // Session closed
    );
  }

  getStatus() {
    return {
      zScoreEntry:  this.zScoreEntry,
      zScoreActive: this.zScoreActive,
      rsiOversold:  this.rsiOversold
    };
  }
}

module.exports = SeForexStrategy;
