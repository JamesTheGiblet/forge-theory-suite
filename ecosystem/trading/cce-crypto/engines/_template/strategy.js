// engines/_template/strategy.js
// CCE Core Framework — Strategy Template
// Implement your FSM transition logic here.
// Keep all thresholds and parameters in config — no hardcoded values.

'use strict';

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  ACTIVE:   'ACTIVE',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

class TemplateStrategy {

  constructor(config = {}) {
    // Source all thresholds from config
    // Example:
    // this.entryThreshold = config.entryThreshold || 0.5;
    // this.exitThreshold  = config.exitThreshold  || 0.2;
  }

  // ── EVALUATE ────────────────────────────────────────────────────────────────
  // Core FSM logic.
  // Given current state + signals + data → return next state.
  // Must be deterministic — same inputs always produce same output.

  evaluate(currentState, signals, data) {

    // STOPPED is terminal until daily reset
    if (currentState === STATE.STOPPED) return STATE.STOPPED;

    switch (currentState) {

      case STATE.DORMANT:
        // Exit DORMANT when conditions start to build
        if (this._entryConditionBuilding(signals)) return STATE.WATCHING;
        return STATE.DORMANT;

      case STATE.WATCHING:
        // Advance to ACTIVE when all conditions align
        if (this._entryConditionMet(signals)) return STATE.ACTIVE;
        // Retreat to DORMANT if conditions deteriorate
        if (this._conditionsDeteriorated(signals)) return STATE.DORMANT;
        return STATE.WATCHING;

      case STATE.ACTIVE:
        // Begin exit when take profit or stop loss hit
        if (this._exitConditionMet(signals, data)) return STATE.EXITING;
        return STATE.ACTIVE;

      case STATE.EXITING:
        // Return to DORMANT after exit completes
        return STATE.DORMANT;

      default:
        return STATE.DORMANT;
    }
  }

  // ── IMPLEMENT THESE ──────────────────────────────────────────────────────────

  _entryConditionBuilding(signals) {
    // Return true when conditions are starting to align
    // but not yet strong enough to deploy capital.
    // Example: price above SMA but volume not yet confirmed
    throw new Error('_entryConditionBuilding() not implemented');
  }

  _entryConditionMet(signals) {
    // Return true when ALL conditions align for deployment.
    // This should be the strictest gate — false positives cost money.
    throw new Error('_entryConditionMet() not implemented');
  }

  _conditionsDeteriorated(signals) {
    // Return true when conditions have broken down
    // and the engine should retreat to DORMANT.
    throw new Error('_conditionsDeteriorated() not implemented');
  }

  _exitConditionMet(signals, data) {
    // Return true when the position should be closed.
    // Check stop loss, take profit, trailing stop, time exits.
    throw new Error('_exitConditionMet() not implemented');
  }

  // ── STATUS ───────────────────────────────────────────────────────────────────

  getStatus() {
    return {
      // Return any strategy-level metrics useful for the dashboard
    };
  }

}

module.exports = TemplateStrategy;
