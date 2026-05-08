// engines/se-goldforge/strategy.js
// S.E GoldForge — FSM Strategy
'use strict';

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  ACTIVE:   'ACTIVE',
  HOLDING:  'HOLDING',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class SeGoldForgeStrategy {

  constructor(config = {}) {
    this.entryFearGreed  = config.entryFearGreed  || 25;  // Enter when F&G <= 25
    this.watchFearGreed  = config.watchFearGreed  || 35;  // Watch when F&G <= 35
    this.exitFearGreed   = config.exitFearGreed   || 55;  // Exit when F&G >= 55
    this.entryGoldMom    = config.entryGoldMom    || 0.5; // Gold rising > 0.5% confirms entry
    this.stopLossPct     = config.stopLossPct     || -8;  // Stop loss at -8%
    this.takeProfitPct   = config.takeProfitPct   || 20;  // Take profit at +20%
  }

  evaluate(currentState, signals) {
    if (currentState === STATE.STOPPED) return STATE.STOPPED;

    switch (currentState) {

      case STATE.DORMANT:
        // Start watching when fear builds
        if (signals.fearBuilding) return STATE.WATCHING;
        return STATE.DORMANT;

      case STATE.WATCHING:
        // Go active when extreme fear + gold rising
        if (signals.extremeFear && signals.goldRising) return STATE.ACTIVE;
        // Go active on extreme fear alone if very low F&G
        if (signals.fearGreed <= 15) return STATE.ACTIVE;
        // Retreat if fear passes
        if (!signals.fearBuilding) return STATE.DORMANT;
        return STATE.WATCHING;

      case STATE.ACTIVE:
        return STATE.HOLDING;

      case STATE.HOLDING:
        // Exit when crypto recovers
        if (signals.cryptoRecovering) return STATE.EXITING;
        // Stop loss
        if (signals.pnlPct <= this.stopLossPct) return STATE.EXITING;
        // Take profit
        if (signals.pnlPct >= this.takeProfitPct) return STATE.EXITING;
        return STATE.HOLDING;

      case STATE.EXITING:
        return STATE.DORMANT;

      default:
        return STATE.DORMANT;
    }
  }
}

module.exports = SeGoldForgeStrategy;
