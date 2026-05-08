// index.js — CCE Platform Core
require('dotenv').config();
const config = require('./config');
const CCSentinelEngine = require('./src/cce-sentinel-engine');
const CCEEngine      = require('./src/cce-engine');
const CCEForexEngine = require('./src/cce-forex-engine');
const CCERMEEngine   = require('./src/cce-rme-engine');
const CCECMEEngine   = require('./src/cce-cme-engine');
const CCECOMOEngine  = require('./src/cce-como-engine');
const CCEGridEngine  = require('./src/cce-grid-engine');
const CCEMOMEngine   = require('./src/cce-mom-engine');
const CCEBRKEngine   = require('./src/cce-brk-engine');
const CCEEGPEngine   = require('./src/cce-egp-engine');
const DXYLayer       = require('./src/dxy-layer');
const CCEOBSEngine   = require('./src/cce-obs-engine');
const CCESTREngine   = require('./src/cce-str-engine');
const CCELCEEngine   = require('./src/cce-lce-engine');
const EngineRegistry = require('./src/engine-registry');
const LayerRegistry  = require('./src/layer-registry');
const { CCEGOEngine } = require('./src/cce-go-engine');
const NotificationService = require('./src/notification');
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

async function validateLicence() {
  const key = process.env.LICENCE_KEY;
  if (!key) throw new Error('No LICENCE_KEY found in .env file.');
  if (key === 'DEV') { console.log('ℹ️  Licence: Development mode'); return; }
  try {
    const response = await axios.post('https://api.gumroad.com/v2/licenses/verify', {
      product_id: process.env.GUMROAD_PRODUCT_ID,
      license_key: key,
      increment_uses_count: false
    });
    if (!response.data.success) throw new Error('Licence key is invalid or has been revoked.');
    console.log('✅ Licence validated');
  } catch (e) {
    if (e.response?.status === 404) throw new Error('Licence key not recognised.');
    console.warn('⚠️  Licence server unreachable. Continuing offline...');
  }
}

function validateConfig(config) {
  const errors = [];
  if (!config.execution.dryRun) {
    const missing = ['KRAKEN_API_KEY','KRAKEN_API_SECRET'].filter(k => !process.env[k]);
    if (missing.length) errors.push(`Missing env vars: ${missing.join(', ')}`);
  }
  if (config.trading.startingCapital < 10) errors.push('Crypto starting capital too low (min $10)');
  if (config.trading.circuitBreakerPct >= 0) errors.push('Circuit breaker must be negative');
  if (errors.length > 0) throw new Error(`Config Validation Failed:\n- ${errors.join('\n- ')}`);
}

const propConfigPath = path.join(__dirname, 'proprietary.config.js');
if (fs.existsSync(propConfigPath)) {
  try {
    const propConfig = require(propConfigPath);
    const deepMerge = (target, source) => {
      for (const key in source) {
        if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };
    deepMerge(config, propConfig);
    console.log('🔒 Proprietary IP configuration loaded.');
  } catch (e) {
    console.warn('⚠️ Error loading proprietary config:', e.message);
  }
}

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   CASCADE COMPOUNDING ENGINE (CCE) — PLATFORM CORE            ║
║   Crypto Engine  +  Forex Engine                               ║
║   Version ${config.system.version}                                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);

(async () => {
  try { validateConfig(config); }
  catch (error) { console.error('\n🛑 CRITICAL CONFIG ERROR\n' + error.message); process.exit(1); }

  try { await validateLicence(); }
  catch (error) { console.error('\n🛑 LICENCE ERROR\n' + error.message); process.exit(1); }

  console.log('🔍 Running Pre-flight Strategy Tests...');
  try {
    require('./tests/test-strategy');
    console.log('✅ Pre-flight tests passed.\n');
  } catch (error) {
    console.error('\n🛑 Strategy Self-Tests Failed');
    console.error(`   Reason: ${error.message}\n`);
    process.exit(1);
  }

  if (!config.execution.dryRun) {
    if (process.env.COINBASE_API_KEY)   console.log('ℹ️  Coinbase credentials detected');
    if (process.env.LUNARCRUSH_API_KEY) console.log('ℹ️  LunarCrush credentials detected');
    console.warn('\n⚠️  ⚠️  ⚠️  CRYPTO LIVE TRADING ENABLED ⚠️  ⚠️  ⚠️');
    console.warn('Press Ctrl+C to abort, or wait 10 seconds...\n');
    for (let i = 10; i > 0; i--) {
      process.stdout.write(`\r⏳ Starting in ${i} seconds... (Ctrl+C to abort) `);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');
  }

  const sharedNotifier = new NotificationService(config);

  // CCE Core Framework — Engine Registry (auto-detects engines/ folder)
  const engineRegistry = new EngineRegistry(config, sharedNotifier, null); // exchange wired below
  await engineRegistry.scan();
  const cryptoEngine   = new CCEEngine(config);
  const forexEnabled   = config.forex?.enabled !== false;
  const forexEngine    = forexEnabled ? new CCEForexEngine(config, sharedNotifier) : null;
  const rmeEnabled     = config.rme?.enabled !== false;
  const rmeEngine      = rmeEnabled ? new CCERMEEngine(config, sharedNotifier) : null;
  const cmeEnabled     = config.cme?.enabled !== false;
  const cmeEngine      = cmeEnabled ? new CCECMEEngine(config, sharedNotifier) : null;
  const comoEnabled    = config.como?.enabled !== false;
  const comoEngine     = comoEnabled ? new CCECOMOEngine(config, sharedNotifier) : null;
  const gridEnabled    = config.grid?.enabled === true;
  const gridEngine     = gridEnabled ? new CCEGridEngine(config, sharedNotifier, cryptoEngine.exchange) : null;
  engineRegistry.exchange = cryptoEngine.exchange; // wire exchange after crypto engine init

  const shutdown = async (signal) => {
    console.log(`\n🛑 Shutdown (${signal})`);
    const forceExit = setTimeout(() => { console.error('💥 Force exit'); process.exit(1); }, 5000);
    if (forexEngine) forexEngine.stop();
    if (goEngine) goEngine.stop();
    layerRegistry?.stopAll();
    engineRegistry?.stopAll();
    if (rmeEngine) rmeEngine.stop();
    if (cmeEngine) cmeEngine.stop();
    if (comoEngine) comoEngine.stop();
    if (gridEngine) gridEngine.stop();
    if (momEngine) momEngine.stop();
    if (brkEngine) brkEngine.stop();
    if (egpEngine) egpEngine.stop();
    if (sentinelEngine) sentinelEngine.stop();
    if (obsEngine) obsEngine.stop();
    if (strEngine) strEngine.stop();
    if (lceEngine) lceEngine.stop();
    await cryptoEngine.stop();
    clearTimeout(forceExit);
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  const cryptoInterval = config.execution.checkIntervalHours || 4;
  const forexInterval  = config.forex?.intervalHours || 1;
  const rmeInterval    = config.rme?.intervalHours || 24;
  const cmeInterval    = config.cme?.intervalHours || 24;
  const comoInterval   = config.como?.intervalHours || 24;
  const gridInterval   = config.grid?.intervalMinutes || 5;

  console.log(`\n🔀 Launching engines in parallel:`);
  console.log(`   📈 CCE Crypto  — ${cryptoInterval}H interval`);
  console.log(`   💱 CCE Forex   — ${forexEnabled ? forexInterval+'H interval | '+(config.forex?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);
  console.log(`   🏢 CCE REIT    — ${rmeEnabled ? rmeInterval+'H interval | '+(config.rme?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);
  console.log(`   📊 CCE Stocks  — ${cmeEnabled ? cmeInterval+'H interval | '+(config.cme?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);
  console.log(`   🛢️  CCE Commod  — ${comoEnabled ? comoInterval+'H interval | '+(config.como?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);
  console.log(`   📐 CCE Grid    — ${gridEnabled ? gridInterval+'min interval | '+(config.grid?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);
  console.log('');

  const engines = [cryptoEngine.start(cryptoInterval)];
  if (forexEngine) engines.push(forexEngine.start(forexInterval));
  if (rmeEngine) engines.push(rmeEngine.start(rmeInterval));
  if (cmeEngine) engines.push(cmeEngine.start(cmeInterval));
  if (comoEngine) engines.push(comoEngine.start(comoInterval));
  if (gridEngine) engines.push(gridEngine.start(gridInterval));

  // T.E Momentum — 2H momentum trading engine
  const momEnabled = config.mom?.enabled === true;
  console.log(`   🚀 T.E Momentum — ${momEnabled ? '120min interval | '+(config.mom?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);
  const momEngine  = momEnabled ? new CCEMOMEngine(config, sharedNotifier, cryptoEngine.exchange) : null;
  if (momEngine) engines.push(momEngine.start(config.mom?.intervalMinutes || 120));

  // T.E Breakout — 1H volatility squeeze breakout engine
  const egpEnabled = config.egp?.enabled === true;
  console.log(`   🏦 S.E EGP      — ${egpEnabled ? 'Weekly | '+(config.egp?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);
  const brkEnabled = config.brk?.enabled === true;
  console.log(`   💥 T.E Breakout  — ${brkEnabled ? '60min interval | '+(config.brk?.dryRun !== false ? 'DRY RUN' : 'LIVE') : 'DISABLED'}`);
  const brkEngine  = brkEnabled ? new CCEBRKEngine(config, sharedNotifier, cryptoEngine.exchange) : null;
  if (brkEngine) engines.push(brkEngine.start(config.brk?.intervalMinutes || 60));

  // S.E EGP — USD/EGP regime classification engine
  const egpEngine  = egpEnabled ? new CCEEGPEngine(config, sharedNotifier) : null;
  if (egpEngine) engines.push(egpEngine.start(config.egp?.intervalMinutes || 10080));

  // O.E Sentinel
  let sentinelEngine = null;
  if (config.sentinel?.enabled) {
    sentinelEngine = new CCSentinelEngine(config.sentinel, sharedNotifier);
    engines.push(sentinelEngine.start());
  }

  // O.E Observer — passive intelligence layer
  const obsEnabled = config.obs?.enabled !== false;
  console.log(`   👁️  O.E Observer  — ${obsEnabled ? (config.obs?.intervalMinutes || 15)+'min interval | ACTIVE' : 'DISABLED'}`);
  const strEnabled = config.str?.enabled === true;
  console.log(`   🧠 O.E Strategist — ${strEnabled ? (config.str?.intervalMinutes || 60)+'min interval | ACTIVE' : 'DISABLED (enable after 96 obs)'}`);
  const obsEngine  = obsEnabled ? new CCEOBSEngine(config, sharedNotifier, {
    crypto: cryptoEngine,
    forex:  forexEngine,
    rme:    rmeEngine,
    cme:    cmeEngine,
    como:   comoEngine,
    grid:   gridEngine
  }) : null;
  if (obsEngine) engines.push(obsEngine.start(config.obs?.intervalMinutes || 15));

  // O.E Strategist — intelligence and recommendation layer
  const strEngine  = strEnabled ? new CCESTREngine(config, sharedNotifier) : null;
  if (strEngine) engines.push(strEngine.start(config.str?.intervalMinutes || 60));

  // T.E LCE — Liquidation Cascade Engine
  const lceEnabled = config.lce?.enabled === true;
  console.log(`   ⚡ T.E LCE       — ${lceEnabled ? (config.lce?.intervalMinutes || 5)+'min interval | '+(config.lce?.dryRun !== false ? 'DRY RUN' : '⚠️ LIVE') : 'DISABLED'}`);
  const lceEngine  = lceEnabled ? new CCELCEEngine(config, sharedNotifier) : null;
  if (lceEngine) engines.push(lceEngine.start(config.lce?.intervalMinutes || 5));

  // CCE Core Framework — build full engine map for registry consumers
  const allEngines = {
    crypto:   cryptoEngine,
    forex:    forexEngine,
    rme:      rmeEngine,
    cme:      cmeEngine,
    como:     comoEngine,
    grid:     gridEngine,
    mom:      momEngine,
    brk:      brkEngine,
    egp:      egpEngine,
    lce:      lceEngine,
    obs:      obsEngine,
    str:      strEngine,
    sentinel: sentinelEngine,
    ...engineRegistry.getAll()
  };

  // Layer Registry — auto-detects ai-layers/ folder
  const layerRegistry = new LayerRegistry(config, sharedNotifier, allEngines);
  
  await layerRegistry.scan();
  const layerPromises = layerRegistry.startAll();
  // Wire registries into dashboard API
  try { const { setupRegistries } = require('./dashboard-server'); setupRegistries(engineRegistry, layerRegistry); } catch(e) {}
  engines.push(...layerPromises);

  // Dynamic engines from engine registry
  const dynamicEngines = engineRegistry.startAll();
  engines.push(...dynamicEngines);

  // G.O Orchestrator — ADVISORY mode, dry run
  const goEnabled = config.go?.enabled === true;
  const goEngine  = goEnabled
    ? new CCEGOEngine(config, sharedNotifier, allEngines, layerRegistry)
    : null;
  if (goEnabled) {
    console.log(`   🧠 G.O Orchestrator — ${config.go?.dryRun !== false ? 'ADVISORY | DRY RUN' : '⚠️  LIVE'}`);
    engines.push(goEngine.start());
  }

  await Promise.all(engines).catch(error => {
    console.error('💥 Fatal engine error:', error);
    process.exit(1);
  });
})();
