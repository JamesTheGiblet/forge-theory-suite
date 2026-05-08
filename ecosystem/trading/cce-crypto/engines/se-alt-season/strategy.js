// engines/se-alt-season/strategy.js
'use strict';

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  ROTATING: 'ROTATING',
  HOLDING:  'HOLDING',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class SeAltSeasonStrategy {

  constructor(config = {}) {
    this.entryDominance  = config.entryDominance  || 52;
    this.activeDominance = config.activeDominance || 50;
    this.exitDominance   = config.exitDominance   || 55;
    this.stopLossPct     = config.stopLossPct     || -20;
    this.takeProfitPct   = config.takeProfitPct   || 50;
  }

  evaluate(currentState, signals) {
    if (currentState === STATE.STOPPED) return STATE.STOPPED;

    switch (currentState) {

      case STATE.DORMANT:
        if (signals.domBuilding && signals.domFalling) return STATE.WATCHING;
        return STATE.DORMANT;

      case STATE.WATCHING:
        if (signals.domLow) return STATE.ROTATING;
        if (!signals.domBuilding) return STATE.DORMANT;
        return STATE.WATCHING;

      case STATE.ROTATING:
        return STATE.HOLDING;

      case STATE.HOLDING:
        if (signals.domRecovering) return STATE.EXITING;
        if (signals.pnlPct <= this.stopLossPct) return STATE.EXITING;
        if (signals.pnlPct >= this.takeProfitPct) return STATE.EXITING;
        return STATE.HOLDING;

      case STATE.EXITING:
        return STATE.DORMANT;

      default:
        return STATE.DORMANT;
    }
  }
}

module.exports = SeAltSeasonStrategy;
