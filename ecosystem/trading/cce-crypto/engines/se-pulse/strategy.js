// engines/se-pulse/strategy.js
// S.E Pulse — Mean Reversion FSM
'use strict';

const STATE = {
  SCANNING: 'SCANNING',
  LOADING:  'LOADING',
  HOLDING:  'HOLDING',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class SePulseStrategy {

  constructor(config = {}) {
    this.dipThreshold  = config.dipThreshold  || -2.5;  // Buy when -2.5% drop
    this.targetReturn  = config.targetReturn  || 1.5;   // Exit at +1.5%
    this.stopLoss      = config.stopLoss      || -4.0;  // Stop at -4%
    this.maxHoldHours  = config.maxHoldHours  || 24;    // Force exit after 24H
    this.minVolumeMult = config.minVolumeMult || 1.2;   // Volume must be 1.2x avg
  }

  evaluate(currentState, signals) {
    if (currentState === STATE.STOPPED) return STATE.STOPPED;

    switch (currentState) {

      case STATE.SCANNING:
        // Enter on significant dip with volume confirmation
        if (signals.dipDetected && signals.volumeConfirmed) return STATE.LOADING;
        return STATE.SCANNING;

      case STATE.LOADING:
        return STATE.HOLDING;

      case STATE.HOLDING:
        // Take profit
        if (signals.pnlPct >= this.targetReturn) return STATE.EXITING;
        // Stop loss
        if (signals.pnlPct <= this.stopLoss) return STATE.EXITING;
        // Time stop — max hold
        if (signals.hoursHeld >= this.maxHoldHours) return STATE.EXITING;
        return STATE.HOLDING;

      case STATE.EXITING:
        return STATE.SCANNING;

      default:
        return STATE.SCANNING;
    }
  }
}

module.exports = SePulseStrategy;
