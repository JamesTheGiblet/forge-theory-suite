// ~/legion/engine/monitor.js
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { computeAllIndicators, evaluateConditionGroup } = require('./indicator_runtime');
const { CandleBuffer } = require('../shared/candle_buffer');

const STRATEGIES_DIR = path.join(__dirname, '../strategies/active');
const MONITOR_LOG = path.join(__dirname, '../data/monitor_log.json');

let activeStrategies = new Map(); // filename -> parsed JSON
let tradeStates = new Map(); // strategy_id -> { inTrade, entryPrice, entryTime }
let candleBuffer = new CandleBuffer(200);

function loadStrategies() {
  const files = fs.readdirSync(STRATEGIES_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.tmp'));
  const newMap = new Map();
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(STRATEGIES_DIR, file), 'utf8');
      const strategy = JSON.parse(content);
      newMap.set(file, strategy);
      if (!tradeStates.has(strategy.scp_id)) {
        tradeStates.set(strategy.scp_id, { inTrade: false, entryPrice: null, entryTime: null });
      }
    } catch (err) {
      console.error(`Failed to load ${file}:`, err.message);
    }
  }
  activeStrategies = newMap;
  console.log(`Loaded ${activeStrategies.size} active strategies`);
}

function evaluateStrategy(strategy, indicators, tradeState, currentTime) {
  const entryOk = evaluateConditionGroup(strategy.conditions.entry, indicators, tradeState);
  const exitOk = evaluateConditionGroup(strategy.conditions.exit, indicators, tradeState);

  if (!tradeState.inTrade && entryOk) {
    // Simulate entry
    tradeState.inTrade = true;
    tradeState.entryPrice = indicators.price;
    tradeState.entryTime = currentTime;
    console.log(`[ENTRY] ${strategy.scp_id} at ${indicators.price}`);
    return { action: 'entry', price: indicators.price };
  } else if (tradeState.inTrade && exitOk) {
    // Simulate exit
    const pnl = (indicators.price - tradeState.entryPrice) / tradeState.entryPrice;
    tradeState.inTrade = false;
    console.log(`[EXIT] ${strategy.scp_id} at ${indicators.price} | PnL: ${(pnl*100).toFixed(2)}%`);
    return { action: 'exit', price: indicators.price, pnl };
  }
  return { action: 'hold' };
}

async function runMonitor() {
  loadStrategies();
  const watcher = chokidar.watch(STRATEGIES_DIR, { persistent: true, ignoreInitial: true });
  watcher.on('add', loadStrategies);
  watcher.on('change', loadStrategies);
  watcher.on('unlink', loadStrategies);

  // Simulate periodic ticks – replace with real price feed later
  setInterval(() => {
    const now = new Date().toISOString();
    // For dry run, we need real candles. Placeholder – you'll integrate Kraken feed.
    // For now, just log that monitor is alive.
    console.log(`[MONITOR] Tick at ${now} – waiting for candle data`);
  }, 5000);
}

if (require.main === module) {
  runMonitor().catch(console.error);
}

module.exports = { runMonitor, evaluateStrategy };
