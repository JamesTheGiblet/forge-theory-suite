'use strict';

const modes = require('./modes');
// index.js — CCE Platform Core
// Cascade Compounding Engine — All engines, correct boot order
'use strict';

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED] Rejection at:', promise, 'reason:', reason?.message || reason);
  console.error('[UNHANDLED] Stack:', reason?.stack?.split('\n').slice(0,5).join(' | '));
});

require('dotenv').config();
const config = require('./config');
const fs   = require('fs');
const path = require('path');
const axios = require('axios');

// ── ENGINE REQUIRES ───────────────────────────────────────────────────────────
const NotificationService = require('./src/notification');
const CCEEngine           = require('./src/cce-engine');
const CCEForexEngine      = require('./src/cce-forex-engine');
const CCEWeatherEngine    = require('./src/cce-weather-engine');
const CCERMEEngine        = require('./src/cce-rme-engine');
const CCECMEEngine        = require('./src/cce-cme-engine');
const CCECOMOEngine       = require('./src/cce-como-engine');
const CCEGridEngine       = require('./src/cce-grid-engine');
const CCEMOMEngine        = require('./src/cce-mom-engine');
const CCEBRKEngine        = require('./src/cce-brk-engine');
const CCEEGPEngine        = require('./src/cce-egp-engine');
const CCELCEEngine        = require('./src/cce-lce-engine');
const CCEOBSEngine        = require('./src/cce-obs-engine');
const CCESTREngine        = require('./src/cce-str-engine');
const CCSentinelEngine    = require('./src/cce-sentinel-engine');
const DXYLayer            = require('./src/dxy-layer');
const EngineRegistry      = require('./src/engine-registry');
const LayerRegistry       = require('./src/layer-registry');
const { CCEGOEngine }     = require('./src/cce-go-engine');

// ── BANNER ────────────────────────────────────────────────────────────────────
console.log(`
╔════════════════════════════════════════════════════════════════╗
║   CASCADE COMPOUNDING ENGINE (CCE) — PLATFORM CORE            ║
║   Version ${config.system?.version || '2.3.8'}                                        ║
╚════════════════════════════════════════════════════════════════╝
`);

// ── CONFIG VALIDATION ─────────────────────────────────────────────────────────
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

// ── LICENCE ───────────────────────────────────────────────────────────────────
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

// ── PROPRIETARY CONFIG ────────────────────────────────────────────────────────
const propConfigPath = path.join(__dirname, 'proprietary.config.js');
if (fs.existsSync(propConfigPath)) {
  try {
    const propConfig = require(propConfigPath);
    const deepMerge = (target, source) => {
      for (const key in source) {
        if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
          deepMerge(target[key], source[key]);
        } else { target[key] = source[key]; }
      }
      return target;
    };
    deepMerge(config, propConfig);
    console.log('🔒 Proprietary config loaded.');
  } catch (e) { console.warn('⚠️ Error loading proprietary config:', e.message); }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
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
    console.warn('\n⚠️  ⚠️  ⚠️  CRYPTO LIVE TRADING ENABLED ⚠️  ⚠️  ⚠️');
    console.warn('Press Ctrl+C to abort, or wait 10 seconds...\n');
    for (let i = 10; i > 0; i--) {
      process.stdout.write(`\r⏳ Starting in ${i} seconds... (Ctrl+C to abort) `);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');
  }


  // ── TIER-BASED ENGINE GATING ─────────────────────────────────────────────────
  // Controls which engines start based on CCE_CLIENT_TIER env var
  // starter  = Kraken only  (S.E Crypto + T.E Grid/MOM/BRK + O.E)
  // advanced = + Binance    (adds T.E LCE)
  // full     = all engines  (adds Forex, REIT, Stocks, Commodities, EGP)

  const clientTier = process.env.CCE_CLIENT_TIER || 'full';

  if (clientTier === 'starter' || clientTier === 'advanced') {
    // Disable broker-dependent engines
    config.forex.enabled  = false;
    config.rme.enabled    = false;
    config.cme.enabled    = false;
    config.como.enabled   = false;
    config.egp.enabled    = false;
    console.log('[TIER] ' + clientTier.toUpperCase() + ' — Broker engines disabled');
  }

  if (clientTier === 'starter') {
    // Disable Binance engines
    config.lce.enabled = false;
    console.log('[TIER] STARTER — Binance engines disabled');
  }

  console.log('[TIER] Active tier: ' + clientTier.toUpperCase() + ' (' + {
    starter:  'Kraken: S.E Crypto + T.E Grid/MOM/BRK + O.E',
    advanced: 'Kraken + Binance: adds T.E LCE',
    full:     'All exchanges: full platform'
  }[clientTier] || 'Full platform' + ')\n');

  // ── SHARED SERVICES ─────────────────────────────────────────────────────────
  const sharedNotifier = new NotificationService(config);

  // ── ENGINE REGISTRY ──────────────────────────────────────────────────────────
  const engineRegistry = new EngineRegistry(config, sharedNotifier, null);
  await engineRegistry.scan();

  // ── CORE ENGINES ─────────────────────────────────────────────────────────────
  const cryptoEngine = new CCEEngine(config);

  const forexEnabled  = config.forex?.enabled  !== false;
  const rmeEnabled    = config.rme?.enabled    !== false;
  const cmeEnabled    = config.cme?.enabled    !== false;
  const comoEnabled   = config.como?.enabled   !== false;
  const egpEnabled    = config.egp?.enabled    === true;
  const lceEnabled    = config.lce?.enabled    === true;
  const obsEnabled    = config.obs?.enabled    !== false;
  const strEnabled    = config.str?.enabled    === true;
  const goEnabled     = config.go?.enabled     === true;
  const weatherEnabled = config.weather?.enabled !== false;

  const forexEngine   = forexEnabled  ? new CCEForexEngine(config, sharedNotifier) : null;
  const rmeEngine     = rmeEnabled    ? new CCERMEEngine(config, sharedNotifier)   : null;
  const cmeEngine     = cmeEnabled    ? new CCECMEEngine(config, sharedNotifier)   : null;
  const comoEngine    = comoEnabled   ? new CCECOMOEngine(config, sharedNotifier)  : null;
  const egpEngine     = egpEnabled    ? new CCEEGPEngine(config, sharedNotifier)   : null;
  const lceEngine     = lceEnabled    ? new CCELCEEngine(config, sharedNotifier)   : null;
  const weatherEngine = weatherEnabled ? new CCEWeatherEngine(config, sharedNotifier) : null;

  // Wire exchange to registry after crypto init
  engineRegistry.exchange = cryptoEngine.exchange;
  // Propagate exchange to already-constructed registry engines
  for (const [id, entry] of engineRegistry._engines) {
    if (entry.instance && entry.instance.exchange === null) {
      entry.instance.exchange = cryptoEngine.exchange;
    }
  }

  // ── OBSERVER ENGINES ─────────────────────────────────────────────────────────
  const obsEngine = obsEnabled ? new CCEOBSEngine(config, sharedNotifier, {
    crypto: cryptoEngine, forex: forexEngine, rme: rmeEngine,
    cme: cmeEngine, como: comoEngine,
    grid: engineRegistry.get('te-grid'),
    fearFade:  engineRegistry.get('se-fear-fade'),
    altSeason: engineRegistry.get('se-alt-season'),
    goldForge: engineRegistry.get('se-goldforge'),
    underdog:  engineRegistry.get('se-underdog'),
    scalp:     engineRegistry.get('te-scalp'),
    pulse:     engineRegistry.get('se-pulse')
  }) : null;
  const strEngine     = strEnabled ? new CCESTREngine(config, sharedNotifier)    : null;
  let sentinelEngine  = config.sentinel?.enabled ? new CCSentinelEngine(config.sentinel, sharedNotifier) : null;

  // ── FULL ENGINE MAP ──────────────────────────────────────────────────────────
  const allEngines = {
    crypto:   cryptoEngine,
    forex:    forexEngine,
    rme:      rmeEngine,
    cme:      cmeEngine,
    como:     comoEngine,
    egp:      egpEngine,
    lce:      lceEngine,
    obs:      obsEngine,
    str:      strEngine,
    sentinel: sentinelEngine,
    ...engineRegistry.getAll()
  };

  // ── LAYER REGISTRY ───────────────────────────────────────────────────────────
  const layerRegistry = new LayerRegistry(config, sharedNotifier, allEngines);
  await layerRegistry.scan();

  // ── G.O ORCHESTRATOR ─────────────────────────────────────────────────────────
  const goEngine = goEnabled
    ? new CCEGOEngine(config, sharedNotifier, allEngines, layerRegistry)
    : null;

  // ── SHUTDOWN HANDLER (defined AFTER all engines) ──────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n🛑 Shutdown (${signal})`);
    const forceExit = setTimeout(() => { console.error('💥 Force exit'); process.exit(1); }, 8000);
    const stopAll = [
      forexEngine, rmeEngine, cmeEngine, comoEngine,
      egpEngine, lceEngine, weatherEngine,
      obsEngine, strEngine, sentinelEngine, goEngine
    ];
    for (const e of stopAll) { try { if (e) e.stop(); } catch(_) {} }
    layerRegistry?.stopAll();
    engineRegistry?.stopAll();
    if (cryptoEngine && typeof cryptoEngine.stop === 'function') {
      try { const r = cryptoEngine.stop(); if (r && typeof r.catch === 'function') await r.catch(() => {}); } catch(_) {}
    }
    clearTimeout(forceExit);
    process.exit(0);
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ── START ALL ENGINES ────────────────────────────────────────────────────────
  const cryptoInterval  = config.execution.checkIntervalHours || 4;
  const forexInterval   = config.forex?.intervalHours    || 1;
  const rmeInterval     = config.rme?.intervalHours      || 24;
  const cmeInterval     = config.cme?.intervalHours      || 24;
  const comoInterval    = config.como?.intervalHours     || 24;
  const gridInterval    = config.grid?.intervalMinutes   || 5;

  console.log('\n🔀 Launching engines:');
  console.log(`   📈 CCE Crypto    — ${cryptoInterval}H`);
  console.log(`   💱 CCE Forex     — ${forexEnabled  ? forexInterval+'H | DRY RUN'   : 'DISABLED'}`);
  console.log(`   🏢 CCE REIT      — ${rmeEnabled    ? rmeInterval+'H | DRY RUN'     : 'DISABLED'}`);
  console.log(`   📊 CCE Stocks    — ${cmeEnabled    ? cmeInterval+'H | DRY RUN'     : 'DISABLED'}`);
  console.log(`   🛢️  CCE Commod   — ${comoEnabled   ? comoInterval+'H | DRY RUN'    : 'DISABLED'}`);
  console.log(`   🏦 S.E EGP       — ${egpEnabled    ? 'ENABLED'                     : 'DISABLED'}`);
  console.log(`   💧 T.E LCE       — ${lceEnabled    ? 'ENABLED'                     : 'DISABLED'}`);
  console.log(`   🌤️  Weather       — ${weatherEnabled ? '6H | DRY RUN'              : 'DISABLED'}`);
  console.log(`   👁️  O.E Observer  — ${obsEnabled    ? 'ENABLED'                    : 'DISABLED'}`);
  console.log(`   🧠 O.E Strategist — ${strEnabled   ? 'ENABLED'                     : 'DISABLED'}`);
  console.log(`   🚨 O.E Sentinel   — ${config.sentinel?.enabled ? 'ENABLED'         : 'DISABLED'}`);
  console.log(`   🧠 G.O            — ${goEnabled    ? 'ADVISORY | DRY RUN'           : 'DISABLED'}`);
  console.log('');

  const engines = [cryptoEngine.start(cryptoInterval)];
  if (forexEngine)    engines.push(forexEngine.start(forexInterval));
  if (rmeEngine)      engines.push(rmeEngine.start(rmeInterval));
  if (cmeEngine)      engines.push(cmeEngine.start(cmeInterval));
  if (comoEngine)     engines.push(comoEngine.start(comoInterval));
  if (egpEngine)      engines.push(egpEngine.start(config.egp?.intervalMinutes || 10080));
  if (lceEngine)      engines.push(lceEngine.start(config.lce?.intervalMinutes || 5));
  if (weatherEngine)  weatherEngine.start(6); // fire-and-forget
  if (obsEngine)      engines.push(obsEngine.start(config.obs?.intervalMinutes || 15));
  if (strEngine)      engines.push(strEngine.start(config.str?.intervalMinutes || 60));
  if (sentinelEngine) engines.push(sentinelEngine.start());
  if (goEngine)       engines.push(goEngine.start());

  // Dynamic engines + layers
  engines.push(...layerRegistry.startAll());
  engines.push(...engineRegistry.startAll());

  await Promise.all(engines).catch(error => {
    console.error('💥 Fatal engine error:', error);
    process.exit(1);
  });

})();
