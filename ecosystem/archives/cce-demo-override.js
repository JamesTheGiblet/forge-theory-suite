// demo.config.js — CCE Demo Edition
// This file locks all engines to dry run mode.
// It cannot be overridden via .env or any other configuration.
// To run live engines, purchase the Local Edition.

module.exports = {
  execution: {
    dryRun: true  // LOCKED — Demo Edition cannot execute live trades
  },
  forex:  { dryRun: true },
  rme:    { dryRun: true },
  cme:    { dryRun: true },
  como:   { dryRun: true },
  egp:    { dryRun: true },
  grid:   { dryRun: true },
  mom:    { dryRun: true },
  brk:    { dryRun: true },
  lce:    { dryRun: true },
};
