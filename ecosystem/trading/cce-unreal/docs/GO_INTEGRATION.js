// ── HOW TO INTEGRATE G.O INTO index.js ───────────────────────────────────────

// CHANGE 1: Add require (after layerRegistry require)
const { CCEGOEngine } = require('./src/cce-go-engine');

// CHANGE 2: After all engines and registries are started, add:
const goEnabled = config.go?.enabled === true;
const goEngine  = goEnabled
  ? new CCEGOEngine(config, sharedNotifier, allEngines, layerRegistry)
  : null;

if (goEngine) {
  console.log('   🧠 G.O Orchestrator — ADVISORY | DRY RUN');
  engines.push(goEngine.start());
}

// CHANGE 3: Add goEngine.stop() to shutdown handler

// ─────────────────────────────────────────────────────────────────────────────
// ── CONFIG BLOCK TO ADD TO config.js ─────────────────────────────────────────

/*
  go: {
    enabled:          false,      // Set true to activate G.O
    dryRun:           true,       // ALWAYS start true — never set false without testing
    tier2Enabled:     false,      // Soft influence — capital ceilings (opt-in)
    tier3Enabled:     false,      // Hard control — pause/resume (explicit only)
    allowLiveAdjust:  false,      // Allow G.O to adjust live S.E Crypto ceiling
    minCeilingPct:    0.20,       // 20% floor per engine
    maxCeilingPct:    2.00,       // 200% ceiling per engine
    maxSingleAdjust:  0.20,       // ±20% max adjustment per cycle
    minPlatformPct:   0.60        // 60% total platform capital floor
  },
*/

// ─────────────────────────────────────────────────────────────────────────────
// ── HOW ENGINES READ THEIR CEILING ───────────────────────────────────────────
// Add this to any engine's runCycle() to respect G.O ceilings:
//
// const { GOCeilingReader } = require('./src/cce-go-engine');
//
// async runCycle() {
//   // Read G.O ceiling at start of each cycle
//   const ceiling = GOCeilingReader.getCeiling('crypto'); // use your engine id
//   const effectiveCapital = this.capital * (ceiling.pct || 1.0);
//   // Use effectiveCapital instead of this.capital for position sizing
// }
//
// ─────────────────────────────────────────────────────────────────────────────
// ── DASHBOARD API ENDPOINT ────────────────────────────────────────────────────
// Add to dashboard-server.js:
//
// app.get('/api/go/status', (req, res) => {
//   if (!goEngine) return res.json({ enabled: false });
//   res.json(goEngine.getStatus());
// });
//
// app.get('/api/go/ceilings', (req, res) => {
//   const { GOCeilingReader } = require('./src/cce-go-engine');
//   const engines = ['crypto','forex','rme','cme','como','egp','grid','mom','brk','lce'];
//   const ceilings = {};
//   engines.forEach(id => { ceilings[id] = GOCeilingReader.getCeiling(id); });
//   res.json(ceilings);
// });
