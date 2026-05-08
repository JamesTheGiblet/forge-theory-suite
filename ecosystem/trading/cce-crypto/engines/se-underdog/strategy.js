// engines/se-underdog/strategy.js
// S.E Underdog — Quality beaten-down alt basket FSM
'use strict';

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  LOADING:  'LOADING',  // Building position
  HOLDING:  'HOLDING',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class SeUnderdogStrategy {

  constructor(config = {}) {
    this.entryFearGreed  = config.entryFearGreed  || 20;  // Enter when F&G <= 20
    this.watchFearGreed  = config.watchFearGreed  || 35;  // Watch when F&G <= 35
    this.exitFearGreed   = config.exitFearGreed   || 60;  // Exit when F&G >= 60
    this.entryDominance  = config.entryDominance  || 54;  // BTC dom must be below this
    this.exitDominance   = config.exitDominance   || 58;  // Exit if BTC dom rises above
    this.stopLossPct     = config.stopLossPct     || -25; // Stop loss at -25%
    this.takeProfitPct   = config.takeProfitPct   || 60;  // Take profit at +60%
  }

  evaluate(currentState, signals) {
    if (currentState === STATE.STOPPED) return STATE.STOPPED;

    switch (currentState) {

      case STATE.DORMANT:
        // Watch when fear builds and BTC dom is not too high
        if (signals.fearBuilding && signals.domAcceptable) return STATE.WATCHING;
        return STATE.DORMANT;

      case STATE.WATCHING:
        // Load when extreme fear confirmed
        if (signals.extremeFear) return STATE.LOADING;
        // Retreat if conditions change
        if (!signals.fearBuilding || !signals.domAcceptable) return STATE.DORMANT;
        return STATE.WATCHING;

      case STATE.LOADING:
        return STATE.HOLDING;

      case STATE.HOLDING:
        // Exit when greed returns
        if (signals.greedReturning) return STATE.EXITING;
        // Exit if BTC dom surges (rotation reverting)
        if (signals.domTooHigh) return STATE.EXITING;
        // Stop loss on basket avg
        if (signals.basketPnl <= this.stopLossPct) return STATE.EXITING;
        // Take profit
        if (signals.basketPnl >= this.takeProfitPct) return STATE.EXITING;
        return STATE.HOLDING;

      case STATE.EXITING:
        return STATE.DORMANT;

      default:
        return STATE.DORMANT;
    }
  }
}

module.exports = SeUnderdogStrategy;
