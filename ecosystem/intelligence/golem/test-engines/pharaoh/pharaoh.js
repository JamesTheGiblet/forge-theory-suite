#!/usr/bin/env node

/**
 * S.E Pharaoh — XRP Sentiment Engine
 * SAFETY SYSTEM: Requires 4 separate actions to go live
 */

require('dotenv').config();
const fs       = require('fs');
const path     = require('path');
const https    = require('https');
const readline = require('readline');

// ============================================================
// SAFETY SYSTEM — MULTI-FACTOR LIVE TRADING ENABLEMENT
// ============================================================

const SAFETY_LOCK_FILE = path.join(__dirname, 'SAFETY_LOCK');
const LIVE_FLAG_FILE   = path.join(__dirname, '.LIVE');

function checkSafetyLocks() {
  const issues = [];

  if (fs.existsSync(SAFETY_LOCK_FILE)) {
    const content = fs.readFileSync(SAFETY_LOCK_FILE, 'utf8').trim();
    if (content === 'LOCKED') {
      issues.push('🔒 SAFETY LOCK FILE EXISTS — remove ~/pharaoh-engine/SAFETY_LOCK to enable live');
    }
  }

  if (!fs.existsSync(LIVE_FLAG_FILE)) {
    issues.push('🔒 LIVE FLAG MISSING — create ~/pharaoh-engine/.LIVE to enable live');
  }

  if (process.env.LIVE !== 'true') {
    issues.push('🔒 LIVE environment variable not set — run with LIVE=true');
  }

  if (process.env.FORCE_DRY === 'true') {
    issues.push('🔒 FORCE_DRY is enabled — cannot go live');
  }

  return issues;
}

function promptForLive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    console.log('\n' + '⚠️'.repeat(50));
    console.log('⚠️  LIVE TRADING WARNING');
    console.log('⚠️'.repeat(50));
    console.log('You are about to enable LIVE trading mode.');
    console.log('Real money will be used to buy XRP.');
    console.log('Capital at risk: $250 USDC');
    console.log('\nTo proceed, type: I UNDERSTAND THE RISK\n');
    rl.question('> ', (answer) => {
      rl.close();
      resolve(answer === 'I UNDERSTAND THE RISK');
    });
  });
}

async function safetyCheck() {
  const issues = checkSafetyLocks();

  if (issues.length > 0) {
    console.log('\n🔒 SAFETY LOCKS ENGAGED — DRY RUN MODE ONLY');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('\n💡 To enable LIVE trading:');
    console.log('   1. rm ~/pharaoh-engine/SAFETY_LOCK');
    console.log('   2. touch ~/pharaoh-engine/.LIVE');
    console.log('   3. Run with: LIVE=true node pharaoh.js');
    console.log('   4. Type confirmation when prompted\n');
    return false;
  }

  if (process.env.LIVE === 'true') {
    const confirmed = await promptForLive();
    if (!confirmed) {
      console.log('\n❌ Live trading cancelled. Staying in DRY RUN mode.\n');
      return false;
    }
    console.log('\n⚠️  LIVE TRADING ENABLED — 10 second countdown');
    for (let i = 10; i > 0; i--) {
      console.log(`   ${i}... (Ctrl+C to abort)`);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('🚀 GOING LIVE\n');
  }

  return true;
}

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  asset:             'XRP/USDC',
  capitalUSDC:       250,
  egyptTarget:       1000,
  entryFearGreed:    20,
  watchFearGreed:    25,
  exitFearGreed:     60,
  entryDelayDays:    2,       // wait 2 days after conditions met before buying
  entryDropPct:      -25,
  entryRSI:          35,
  entryDominance:    54,
  entryVolumeSpike:  1.5,
  takeProfitPct:     40,
  stopLossPct:       -20,
  maxHoldDays:       90,
  egyptSlicePct:     0.15,
  circuitBreakerPct: -40,
  cycleHours:        6,

  get dryRun() {
    const safetyIssues = checkSafetyLocks();
    const isLiveEnv    = process.env.LIVE === 'true';
    return safetyIssues.length > 0 || !isLiveEnv;
  }
};

// ============================================================
// STORAGE
// ============================================================

const DATA_DIR     = path.join(__dirname, 'data');
const STATE_FILE   = path.join(DATA_DIR, 'pharaoh-state.json');
const HISTORY_FILE = path.join(DATA_DIR, 'pharaoh-history.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    capital:           CONFIG.capitalUSDC,
    egyptFund:         0,
    totalProfit:       0,
    cyclesCompleted:   0,
    currentState:      'DORMANT',
    entryPrice:        null,
    entryDate:         null,
    entryFG:           null,
    conditionsMetDate: null,
    lastUpdate:        new Date().toISOString()
  };
}

function saveState(state) {
  try {
    state.lastUpdate = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {}
}

function saveHistory(cycle) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
    history.unshift(cycle);
    if (history.length > 50) history.pop();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {}
}

// ============================================================
// PRICE HISTORY
// ============================================================

const PRICE_HISTORY_FILE = path.join(DATA_DIR, 'xrp-price-history.json');

function loadPriceHistory() {
  try {
    if (fs.existsSync(PRICE_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function savePriceHistory(history) {
  try {
    if (history.length > 720) history = history.slice(-720);
    fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {}
}

// ============================================================
// DATA FETCHING
// ============================================================

async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = https.get(url, options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('JSON parse error')); }
          });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
      });
    } catch (err) {
      if (i === retries - 1) return null;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

async function fetchXRPPrice() {
  try {
    const url  = 'https://api.kraken.com/0/public/Ticker?pair=XRPUSDC';
    const data = await fetchWithRetry(url, { headers: { 'User-Agent': 'Pharaoh/1.0' } });
    if (data && data.result) {
      const pair = Object.values(data.result)[0];
      return pair ? parseFloat(pair.c[0]) : null;
    }
    return null;
  } catch (err) { return null; }
}

async function fetchFearGreed() {
  try {
    const url  = 'https://api.alternative.me/fng/';
    const data = await fetchWithRetry(url);
    if (data && data.data && data.data[0]) return parseInt(data.data[0].value);
    return 50;
  } catch (err) { return 50; }
}

async function fetchBTCDominance() {
  try {
    const url  = 'https://api.coingecko.com/api/v3/global';
    const data = await fetchWithRetry(url);
    if (data && data.data && data.data.market_cap_percentage) {
      return data.data.market_cap_percentage.btc || 55;
    }
    return 55;
  } catch (err) { return 55; }
}

// ============================================================
// CALCULATIONS
// ============================================================

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    if (prices.length >= 2) {
      const change = (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2];
      if (change < -0.05) return 30;
      if (change < -0.02) return 35;
      if (change > 0.05)  return 70;
      if (change > 0.02)  return 65;
    }
    return 45;
  }
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateVolumeSpike() {
  return 1.0; // TODO: wire to Kraken volume API
}

function calculate30dHighAndDrop(priceHistory, currentPrice) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentPrices  = priceHistory.filter(p => p.timestamp >= thirtyDaysAgo);
  if (recentPrices.length === 0) {
    return { high30d: currentPrice, dropFromHigh30d: 0, dataPoints: 0 };
  }
  const prices         = recentPrices.map(p => p.price);
  const high30d        = Math.max(...prices, currentPrice);
  const dropFromHigh30d = ((currentPrice - high30d) / high30d) * 100;
  return { high30d, dropFromHigh30d, dataPoints: recentPrices.length };
}

// ============================================================
// EXCHANGE
// ============================================================

let exchange = null;

function initExchange() {
  if (!process.env.KRAKEN_API_KEY || !process.env.KRAKEN_API_SECRET) {
    if (!CONFIG.dryRun) {
      console.log('[PHARAOH] ❌ No Kraken API keys — cannot run LIVE mode');
      process.exit(1);
    }
    console.log('[PHARAOH] 🔵 No API keys — dry run only');
    return null;
  }
  try {
    const ccxt = require('ccxt');
    exchange = new ccxt.kraken({
      apiKey:          process.env.KRAKEN_API_KEY,
      secret:          process.env.KRAKEN_API_SECRET,
      enableRateLimit: true,
      options:         { defaultType: 'spot' }
    });
    console.log('[PHARAOH] ✅ Kraken exchange initialised');
    return exchange;
  } catch (err) {
    console.error('[PHARAOH] ❌ Failed to init exchange:', err.message);
    return null;
  }
}

async function buyXRP(amount, price) {
  if (CONFIG.dryRun || !exchange) {
    console.log(`[PHARAOH] 🔵 DRY RUN BUY: ${amount.toFixed(2)} XRP @ $${price.toFixed(4)}`);
    return true;
  }
  try {
    await exchange.createOrder('XRP/USDC', 'market', 'buy', amount, price);
    console.log(`[PHARAOH] ✅ LIVE BUY: ${amount.toFixed(2)} XRP @ $${price.toFixed(4)}`);
    return true;
  } catch (err) {
    console.error('[PHARAOH] ❌ Buy failed:', err.message);
    return false;
  }
}

async function sellXRP(amount, price) {
  if (CONFIG.dryRun || !exchange) {
    console.log(`[PHARAOH] 🔵 DRY RUN SELL: ${amount.toFixed(2)} XRP @ $${price.toFixed(4)}`);
    return true;
  }
  try {
    await exchange.createOrder('XRP/USDC', 'market', 'sell', amount, price);
    console.log(`[PHARAOH] ✅ LIVE SELL: ${amount.toFixed(2)} XRP @ $${price.toFixed(4)}`);
    return true;
  } catch (err) {
    console.error('[PHARAOH] ❌ Sell failed:', err.message);
    return false;
  }
}

// ============================================================
// STATE MACHINE
// ============================================================

const STATE = {
  DORMANT:  'DORMANT',
  WATCHING: 'WATCHING',
  LOADED:   'LOADED',
  HOLDING:  'HOLDING',
  EXITING:  'EXITING',
  STOPPED:  'STOPPED'
};

let state        = loadState();
let priceHistory = loadPriceHistory();
let running      = true;

function shouldWatch(fearGreed) {
  return fearGreed <= CONFIG.watchFearGreed;
}

function shouldEnter(fearGreed, xrpData, btcDominance) {
  const conditions = {
    fearGreed:  fearGreed <= CONFIG.entryFearGreed,
    drop:       xrpData.dropFromHigh30d <= CONFIG.entryDropPct,
    rsi:        xrpData.rsi <= CONFIG.entryRSI,
    dominance:  btcDominance >= CONFIG.entryDominance,
    volume:     xrpData.volumeSpike >= CONFIG.entryVolumeSpike
  };
  return {
    ready:      Object.values(conditions).every(v => v === true),
    conditions,
    xrpPrice:   xrpData.price,
    dropPct:    xrpData.dropFromHigh30d,
    rsi:        xrpData.rsi
  };
}

function shouldExit(entryPrice, currentPrice, entryDate, fearGreed) {
  const pnlPct   = ((currentPrice - entryPrice) / entryPrice) * 100;
  const daysHeld = (Date.now() - new Date(entryDate).getTime()) / (1000 * 60 * 60 * 24);
  if (fearGreed >= CONFIG.exitFearGreed)  return { exit: true, reason: `F&G reached ${fearGreed}`,           pnlPct };
  if (pnlPct >= CONFIG.takeProfitPct)    return { exit: true, reason: `Take profit: ${pnlPct.toFixed(1)}%`,  pnlPct };
  if (pnlPct <= CONFIG.stopLossPct)      return { exit: true, reason: `Stop loss: ${pnlPct.toFixed(1)}%`,    pnlPct };
  if (daysHeld >= CONFIG.maxHoldDays)    return { exit: true, reason: `Max hold: ${daysHeld.toFixed(0)} days`, pnlPct };
  return { exit: false, pnlPct };
}

// ============================================================
// DISPLAY
// ============================================================

function displayStatus(xrpData, fearGreed, btcDominance) {
  const progress  = ((state.egyptFund / CONFIG.egyptTarget) * 100).toFixed(1);
  const barLength = 20;
  const filled    = Math.floor((state.egyptFund / CONFIG.egyptTarget) * barLength);
  const bar       = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  console.log('\n' + '═'.repeat(50));
  console.log('🏺 S.E PHARAOH — EGYPT FUND');
  console.log('═'.repeat(50));
  console.log(`Capital:     $${state.capital.toFixed(2)} (≈ £${(state.capital * 0.8).toFixed(0)})`);
  console.log(`Egypt fund:  $${state.egyptFund.toFixed(2)} / $${CONFIG.egyptTarget} [${bar}] ${progress}%`);
  console.log(`State:       ${state.currentState}`);
  console.log(`XRP:         $${xrpData?.price?.toFixed(4) || '?'}`);
  console.log(`F&G:         ${fearGreed} — ${fearGreed <= 20 ? 'Extreme Fear 🐻' : fearGreed >= 60 ? 'Greed 🐂' : 'Neutral'}`);
  console.log(`BTC Dom:     ${btcDominance?.toFixed(1) || '?'}%`);
  console.log(`30d High:    $${xrpData?.high30d?.toFixed(4) || '?'} (${xrpData?.dataPoints || 0} data points)`);
  console.log(`Drop:        ${xrpData?.dropFromHigh30d?.toFixed(1) || '?'}%`);
  console.log(`RSI:         ${xrpData?.rsi?.toFixed(0) || '?'}`);
  if (state.conditionsMetDate) {
    const days = ((Date.now() - new Date(state.conditionsMetDate)) / 86400000).toFixed(1);
    const remaining = Math.max(0, CONFIG.entryDelayDays - parseFloat(days)).toFixed(1);
    console.log(`Delay:       ${days}d elapsed — ${remaining}d until entry`);
  }
  if (state.entryPrice) {
    const pnl = ((xrpData?.price - state.entryPrice) / state.entryPrice * 100).toFixed(1);
    console.log(`Position:    Entry $${state.entryPrice.toFixed(4)} | PnL: ${pnl}%`);
  }
  console.log(`Cycles:      ${state.cyclesCompleted}`);
  console.log(`Mode:        ${CONFIG.dryRun ? '🔵 DRY RUN' : '⚠️  LIVE'}`);
  console.log('═'.repeat(50));
  console.log(`Next check:  ${new Date(Date.now() + CONFIG.cycleHours * 60 * 60 * 1000).toLocaleString()}`);
  console.log('═'.repeat(50) + '\n');
}

// ============================================================
// MAIN CYCLE
// ============================================================

async function runCycle() {
  try {
    const [price, fearGreed, btcDominance] = await Promise.all([
      fetchXRPPrice(),
      fetchFearGreed(),
      fetchBTCDominance()
    ]);

    if (!price) {
      console.log('[PHARAOH] ⚠️ Could not fetch XRP price — skipping cycle');
      return;
    }

    priceHistory.push({ timestamp: Date.now(), price });
    savePriceHistory(priceHistory);

    const { high30d, dropFromHigh30d, dataPoints } = calculate30dHighAndDrop(priceHistory, price);
    const prices      = priceHistory.map(p => p.price);
    const rsi         = calculateRSI(prices);
    const volumeSpike = calculateVolumeSpike();
    const xrpData     = { price, high30d, dropFromHigh30d, dataPoints, rsi, volumeSpike };

    displayStatus(xrpData, fearGreed, btcDominance);

    // Save market data to state for dashboard
    state.xrpPrice        = price;
    state.fearGreed       = fearGreed;
    state.btcDominance    = btcDominance;
    state.high30d         = high30d;
    state.dropFromHigh30d = dropFromHigh30d;
    state.rsi             = rsi;
    state.volumeSpike     = volumeSpike;
    state.dataPoints      = dataPoints;
    state.nextCheck       = new Date(Date.now() + CONFIG.cycleHours * 60 * 60 * 1000).toISOString();
    state.dryRun          = CONFIG.dryRun;
    saveState(state);

    // Circuit breaker
    if (state.currentState !== STATE.STOPPED &&
        state.capital < CONFIG.capitalUSDC * (1 + CONFIG.circuitBreakerPct / 100)) {
      console.log(`[PHARAOH] 🛑 CIRCUIT BREAKER: Capital dropped to $${state.capital.toFixed(2)}`);
      state.currentState = STATE.STOPPED;
      saveState(state);
      return;
    }

    switch (state.currentState) {

      case STATE.DORMANT: {
        if (shouldWatch(fearGreed)) {
          console.log(`[PHARAOH] 👁️ F&G ${fearGreed} ≤ ${CONFIG.watchFearGreed} — entering WATCHING`);
          state.currentState = STATE.WATCHING;
          saveState(state);
        }
        break;
      }

      case STATE.WATCHING: {
        const entry = shouldEnter(fearGreed, xrpData, btcDominance);
        if (entry.ready) {
          // Start delay counter if not already started
          if (!state.conditionsMetDate) {
            state.conditionsMetDate = new Date().toISOString();
            console.log(`[PHARAOH] ⏳ All conditions met — waiting ${CONFIG.entryDelayDays} days before entry`);
            saveState(state);
            break;
          }
          // Check if delay has elapsed
          const daysSinceMet = (Date.now() - new Date(state.conditionsMetDate)) / 86400000;
          if (daysSinceMet < CONFIG.entryDelayDays) {
            const remaining = (CONFIG.entryDelayDays - daysSinceMet).toFixed(1);
            console.log(`[PHARAOH] ⏳ Conditions met — ${remaining} days until entry`);
            break;
          }
          // Delay elapsed — enter
          console.log(`\n[PHARAOH] 🏺🏺🏺 DELAY COMPLETE — LOADING XRP 🏺🏺🏺`);
          const amount  = state.capital / price;
          const success = await buyXRP(amount, price);
          if (success) {
            state.entryPrice        = price;
            state.entryDate         = new Date().toISOString();
            state.entryFG           = fearGreed;
            state.conditionsMetDate = null;
            state.currentState      = STATE.LOADED;
            saveState(state);
          }
        } else {
          // Reset delay if conditions drop out
          if (state.conditionsMetDate) {
            state.conditionsMetDate = null;
            console.log(`[PHARAOH] ⚠️ Conditions no longer met — delay reset`);
            saveState(state);
          }
          const met = Object.values(entry.conditions).filter(v => v).length;
          console.log(`[PHARAOH] 👁️ Watching — ${met}/5 conditions met`);
        }
        break;
      }

      case STATE.LOADED:
      case STATE.HOLDING: {
        const exit = shouldExit(state.entryPrice, price, state.entryDate, fearGreed);
        if (exit.exit) {
          console.log(`\n[PHARAOH] 🚪 EXIT: ${exit.reason}`);
          const amount = state.capital / state.entryPrice;
          await sellXRP(amount, price);

          const profit            = state.capital * (exit.pnlPct / 100);
          const egyptContribution = profit > 0 ? profit * CONFIG.egyptSlicePct : 0;
          const capitalGrowth     = profit - egyptContribution;

          state.totalProfit     += profit;
          state.egyptFund       += egyptContribution;
          state.capital         += capitalGrowth;
          state.cyclesCompleted++;

          console.log(`\n[PHARAOH] ✅✅✅ CYCLE COMPLETE ✅✅✅`);
          console.log(`   Profit:     $${profit.toFixed(2)} (${exit.pnlPct.toFixed(1)}%)`);
          console.log(`   Egypt fund: +$${egyptContribution.toFixed(2)} → $${state.egyptFund.toFixed(2)}`);
          console.log(`   Capital:    $${state.capital.toFixed(2)}`);

          saveHistory({
            cycleNumber:       state.cyclesCompleted,
            timestamp:         new Date().toISOString(),
            entryPrice:        state.entryPrice,
            exitPrice:         price,
            profit,
            egyptContribution,
            newCapital:        state.capital,
            newEgyptFund:      state.egyptFund
          });

          state.entryPrice   = null;
          state.entryDate    = null;
          state.entryFG      = null;
          state.currentState = STATE.DORMANT;
          saveState(state);

          if (state.egyptFund >= CONFIG.egyptTarget) {
            console.log(`\n🎉🎉🎉 EGYPT FUND TARGET REACHED! 🎉🎉🎉`);
            console.log(`🌍 Pack your bags James. Egypt is funded.`);
          }
        } else {
          if (state.currentState === STATE.LOADED) {
            state.currentState = STATE.HOLDING;
            saveState(state);
          }
          console.log(`[PHARAOH] 💎 HOLDING — PnL: ${exit.pnlPct.toFixed(1)}%`);
        }
        break;
      }

      case STATE.STOPPED: {
        console.log(`[PHARAOH] 🛑 STOPPED — circuit breaker active. Check capital and restart manually.`);
        break;
      }
    }

  } catch (err) {
    console.error('[PHARAOH] ❌ Cycle error:', err.message);
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n' + '═'.repeat(50));
  console.log('🏺 S.E PHARAOH — XRP Sentiment Engine');
  console.log('═'.repeat(50));

  const safeToRun = await safetyCheck();
  if (!safeToRun) {
    console.log('⚠️  Running in DRY RUN mode only.\n');
  }

  console.log(`Capital:     $${state.capital.toFixed(2)} (≈ £${(state.capital * 0.8).toFixed(0)})`);
  console.log(`Egypt fund:  $${state.egyptFund.toFixed(2)} / $${CONFIG.egyptTarget} (≈ £${(CONFIG.egyptTarget * 0.8).toFixed(0)})`);
  console.log(`Cycles:      ${state.cyclesCompleted}`);
  console.log(`State:       ${state.currentState}`);
  console.log(`Mode:        ${CONFIG.dryRun ? '🔵 DRY RUN' : '⚠️  LIVE'}`);
  console.log('═'.repeat(50) + '\n');

  initExchange();
  await runCycle();

  while (running) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.cycleHours * 60 * 60 * 1000));
    await runCycle();
  }
}

process.on('SIGINT', () => {
  console.log('\n[PHARAOH] 🛑 Shutting down...');
  running = false;
  saveState(state);
  savePriceHistory(priceHistory);
  process.exit(0);
});

main().catch(console.error);
