// engines/se-fear-fade/strategy.js
// S.E Fear Fade — FSM Strategy

'use strict';

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  ACTIVE:   'ACTIVE',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class SeFearFadeStrategy {

  constructor(config = {}) {
    this.entryFearGreed  = config.entryFearGreed  || 20;  // Buy when F&G below this
    this.watchFearGreed  = config.watchFearGreed  || 30;  // Watch when F&G below this
    this.exitFearGreed   = config.exitFearGreed   || 60;  // Sell when F&G above this
    this.stopLossPct     = config.stopLossPct     || -15; // Stop loss at -15%
    this.takeProfitPct   = config.takeProfitPct   || 40;  // Take profit at +40%
  }

  evaluate(currentState, signals, data) {
    if (currentState === STATE.STOPPED) return STATE.STOPPED;

    switch (currentState) {

      case STATE.DORMANT:
        // Start watching when fear is building
        if (signals.fearBuilding) return STATE.WATCHING;
        return STATE.DORMANT;

      case STATE.WATCHING:
        // Go active when extreme fear confirmed
        if (signals.extremeFear) return STATE.ACTIVE;
        // Retreat if fear passes without hitting extreme
        if (!signals.fearBuilding) return STATE.DORMANT;
        return STATE.WATCHING;

      case STATE.ACTIVE:
        // Exit when greed returns
        if (signals.greedReturning) return STATE.EXITING;
        // Stop loss
        if (signals.pnlPct <= this.stopLossPct) return STATE.EXITING;
        // Take profit
        if (signals.pnlPct >= this.takeProfitPct) return STATE.EXITING;
        return STATE.ACTIVE;

      case STATE.EXITING:
        return STATE.DORMANT;

      default:
        return STATE.DORMANT;
    }
  }

  getStatus() {
    return {
      entryFearGreed: this.entryFearGreed,
      exitFearGreed:  this.exitFearGreed,
      stopLossPct:    this.stopLossPct,
      takeProfitPct:  this.takeProfitPct
    };
  }
}

module.exports = SeFearFadeStrategy;
