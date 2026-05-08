#!/usr/bin/env python3
# egp_wire.py — Wire S.E EGP into CCE Platform Core
# Run from ~/cce-crypto: python3 ~/egp_wire.py

idx = open('index.js').read()

# 1. Add require
idx = idx.replace(
    "const DXYLayer       = require('./src/dxy-layer');",
    "const DXYLayer       = require('./src/dxy-layer');\nconst CCEEGPEngine   = require('./src/cce-egp-engine');"
)

# 2. Add to shutdown
idx = idx.replace(
    "if (brkEngine) brkEngine.stop();",
    "if (brkEngine) brkEngine.stop();\n    if (egpEngine) egpEngine.stop();"
)

# 3. Add instantiation after BRK
idx = idx.replace(
    "  if (brkEngine) engines.push(brkEngine.start(config.brk?.intervalMinutes || 60));",
    """  if (brkEngine) engines.push(brkEngine.start(config.brk?.intervalMinutes || 60));

  // S.E EGP — USD/EGP regime classification engine
  const egpEnabled = config.egp?.enabled === true;
  const egpEngine  = egpEnabled ? new CCEEGPEngine(config, sharedNotifier) : null;
  if (egpEngine) engines.push(egpEngine.start(config.egp?.intervalMinutes || 10080));"""
)

# 4. Add to banner
idx = idx.replace(
    "  const brkEnabled = config.brk?.enabled === true;\n  console.log(`   💥 T.E Breakout",
    "  const egpEnabled = config.egp?.enabled === true;\n  console.log(`   🏦 S.E EGP      — ${egpEnabled ? 'Weekly | '+(config.egp?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);\n  const brkEnabled = config.brk?.enabled === true;\n  console.log(`   💥 T.E Breakout"
)

open('index.js', 'w').write(idx)
print('index.js patched')

# 5. Patch config.js
cfg = open('config.js').read()

egp_block = """  egp: {
    enabled:          false,  // Set to true when ready
    dryRun:           true,
    intervalMinutes:  10080,  // Weekly (7 days)

    // CBE data — update on meeting days
    cbeRate:          19.0,   // Current overnight deposit rate %
    prevCbeRate:      20.0,   // Previous rate (before last cut)
    inflation:        13.4,   // Latest CPI % (Feb 2026)
    prevInflation:    12.0,   // Prior month CPI %
    reserves:         52.7,   // Net international reserves $bn
    prevReserves:     47.1,   // Prior month reserves $bn
    cdsDelta:         0,      // CDS spread delta (manual watch)
    nextCbeMeeting:   '2026-04-02'
  },"""

cfg = cfg.replace(
    "  brk: {",
    egp_block + "\n  brk: {"
)

open('config.js', 'w').write(cfg)
print('config.js patched')

print('\nDone! S.E EGP wired in.')
print('Steps to activate:')
print('1. Set egp.enabled = true in config.js')
print('2. Verify CBE rate and inflation values are current')
print('3. pm2 start ecosystem.config.js')
print('4. Watch for [EGP] 🏦 Starting S.E EGP Engine in logs')
