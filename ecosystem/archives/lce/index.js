// index.js — LCE Entry Point
// Pre-flight checks → init → start engine + dashboard

require('dotenv').config();
const config = require('./config');
const LCEEngine = require('./src/lce-engine');
const Dashboard = require('./src/dashboard');

async function preflight() {
  const checks = [];

  // 1. Coinglass API key (warn only — Binance fallback available)
  if (!config.data.coinglassApiKey) {
    console.warn('[LCE] ⚠️  No COINGLASS_API_KEY — using Binance fallback for liquidations');
  } else {
    checks.push('✅ Coinglass API key present');
  }

  // 2. Telegram
  if (!config.telegram.token || !config.telegram.chatId) {
    console.warn('[LCE] ⚠️  No Telegram config — notifications disabled');
  } else {
    checks.push('✅ Telegram configured');
  }

  // 3. Live trading checks
  if (!config.engine.dryRun) {
    if (!config.exchange.apiKey || !config.exchange.secret) {
      throw new Error('LIVE mode requires KRAKEN_API_KEY and KRAKEN_SECRET in .env');
    }
    checks.push('✅ Kraken API keys present');
    console.warn('[LCE] ⚠️  LIVE TRADING MODE — real funds at risk');
  } else {
    checks.push('✅ Dry run mode (safe)');
  }

  checks.forEach(c => console.log(`[LCE] ${c}`));
  return true;
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  ⚡ LCE — Liquidation Cascade Engine v1.0.0  ║');
  console.log('║     Other traders\' pain is your signal.      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  try {
    await preflight();

    const engine = new LCEEngine();
    await engine.init();

    const dashboard = new Dashboard(engine);
    dashboard.start();

    engine.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[LCE] 🛑 Shutting down gracefully...');
      engine.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      engine.stop();
      process.exit(0);
    });

  } catch (err) {
    console.error(`[LCE] ❌ Fatal: ${err.message}`);
    process.exit(1);
  }
}

main();
