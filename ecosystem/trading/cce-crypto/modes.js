// ============================================================
// modes.js — CCE Trading Mode Configuration
// ============================================================
// THIS IS THE ONLY FILE YOU NEED TO EDIT TO SWITCH LIVE/DRY RUN
//
// Master switch controls all engines unless overridden below.
// Set dryRun: false to go live. Set dryRun: true for simulation.
//
// Per-engine overrides let you run some live and some in dry run.
// null = inherit from master switch
// true = always dry run regardless of master
// false = always live regardless of master
// ============================================================

module.exports = {

  // ── MASTER SWITCH ─────────────────────────────────────────
  // Change this one value to go live or return to dry run
  dryRun: false,

  // ── PER-ENGINE OVERRIDES ──────────────────────────────────
  engines: {
    // Strategic Engines — currently dry run only
    'se-crypto':     null,    // inherits master (LIVE when master=false)
    'te-grid':       null,    // inherits master (LIVE when master=false)
    'se-fear-fade':  true,    // inherits master (LIVE)
    'se-alt-season': true,    // always dry run
    'se-goldforge':  true,    // always dry run
    'se-underdog':   true,    // always dry run
    'se-pulse':      true,    // always dry run
    'te-breakout':   true,    // always dry run
    'te-momentum':   true,    // always dry run
    'te-scalp':      true,    // always dry run
    'forex':         true,    // always dry run
    'rme':           true,    // always dry run
    'cme':           true,    // always dry run
  },

  // ── HELPER ────────────────────────────────────────────────
  // Call this to check if a specific engine should be dry run
  isDryRun(engineId) {
    const override = this.engines[engineId];
    if (override === null || override === undefined) return this.dryRun;
    return override;
  }

};
