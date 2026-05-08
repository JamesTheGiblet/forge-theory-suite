#!/usr/bin/env node
/**
 * regime_watcher.js - Self‑updating regime detector
 * Fetches missing daily candles from Kraken if needed.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const STATE_FILE   = path.join(__dirname, 'reasoning-bot/data/regime_state.json');
const ARCHIVE_FILE = path.join(__dirname, 'reasoning-bot/data/strategy_archive.json');
const CANDLE_JSON  = path.join(__dirname, 'candles.json');
const BASE         = __dirname;
const REGIME_THRESHOLD = 3;

// ── Helper: fetch daily candles from Kraken (no dependencies) ──────────────
function fetchKrakenOHLC(pair, interval = 1440, since = null) {
  return new Promise((resolve, reject) => {
    let url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}`;
    if (since) url += `&since=${since}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error && json.error.length) return reject(json.error[0]);
          if (!json.result) return reject('No result');
          const pairKey = Object.keys(json.result).find(k => k !== 'last');
          if (!pairKey) return reject('Pair not found');
          const candles = json.result[pairKey].map(c => ({
            pair: pair,
            interval: '1D',
            timestamp: c[0],
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[7])
          }));
          resolve({ candles, lastId: json.result.last });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ── Ensure candles.json is up to date ──────────────────────────────────────
async function updateCandles() {
  console.log('   🔄 Checking candle data...');
  let candles = [];
  if (fs.existsSync(CANDLE_JSON)) {
    candles = JSON.parse(fs.readFileSync(CANDLE_JSON, 'utf8'));
  }
  // Get all BTC/USD 1D candles
  let btcDaily = candles.filter(c => c.pair === 'BTC/USD' && c.interval === '1D')
                         .sort((a,b) => a.timestamp - b.timestamp);
  const lastDate = btcDaily.length ? new Date(btcDaily[btcDaily.length-1].timestamp * 1000) : null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (!lastDate || lastDate < yesterday) {
    console.log('   📡 Fetching missing daily candles from Kraken...');
    const since = lastDate ? Math.floor(lastDate.getTime() / 1000) + 86400 : null;
    try {
      const { candles: newCandles } = await fetchKrakenOHLC('BTC/USD', 1440, since);
      if (newCandles.length) {
        // Merge and deduplicate by timestamp
        const existingTimestamps = new Set(btcDaily.map(c => c.timestamp));
        const toAdd = newCandles.filter(c => !existingTimestamps.has(c.timestamp));
        candles.push(...toAdd);
        // Keep only BTC/USD 1D? Actually keep all pairs/intervals, but we only fetched BTC/USD 1D.
        // Sort and save
        candles.sort((a,b) => a.timestamp - b.timestamp);
        fs.writeFileSync(CANDLE_JSON, JSON.stringify(candles, null, 2));
        console.log(`   ✅ Added ${toAdd.length} new daily candles (latest: ${new Date(toAdd[toAdd.length-1].timestamp*1000).toISOString().slice(0,10)})`);
        // Update btcDaily array for regime calculation
        btcDaily = candles.filter(c => c.pair === 'BTC/USD' && c.interval === '1D')
                          .sort((a,b) => a.timestamp - b.timestamp);
      }
    } catch (err) {
      console.error('   ⚠️ Kraken fetch failed:', err.message);
    }
  } else {
    console.log('   ✅ Candle data is recent (last: ' + lastDate.toISOString().slice(0,10) + ')');
  }
  return btcDaily;
}

// ── Regime calculation (from candles) ──────────────────────────────────────
function calcRegime(candles) {
  if (candles.length < 20) return 'RANGING';
  const prices  = candles.slice(-20).map(c => c.close);
  const returns = prices.slice(1).map((p, j) => (p - prices[j]) / prices[j] * 100);
  const mean    = returns.reduce((a, b) => a + b, 0) / returns.length;
  const vol14   = Math.sqrt(returns.slice(-14).reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 14);
  const trend20 = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
  if (Math.abs(trend20) > 15 && vol14 > 2) return trend20 > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  if (vol14 > 3)   return 'VOLATILE';
  if (vol14 < 1.5) return 'QUIET';
  return 'RANGING';
}

// ── Load candles (now from updated JSON) ───────────────────────────────────
async function loadCandles(limit) {
  limit = limit || 200;
  const btcDaily = await updateCandles();
  return btcDaily.slice(-limit);
}

// ── State management (same as before) ──────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {}
  return { current_regime: 'UNKNOWN', last_trigger: null, last_checked: null };
}
function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
function archiveStrategy(strategy, reason) {
  let archive = { version: "1.0.0", archived_strategies: [], summary: { total_archived: 0 } };
  try {
    if (fs.existsSync(ARCHIVE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
      if (Array.isArray(parsed)) archive.archived_strategies = parsed;
      else archive = parsed;
    }
  } catch (e) {}
  if (!archive.archived_strategies) archive.archived_strategies = [];
  archive.archived_strategies.unshift({ ...strategy, archived_at: new Date().toISOString(), reason: reason });
  archive.summary.total_archived = archive.archived_strategies.length;
  archive.last_updated = new Date().toISOString();
  archive.archived_strategies = archive.archived_strategies.slice(0, 100);
  fs.mkdirSync(path.dirname(ARCHIVE_FILE), { recursive: true });
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2));
  console.log('   📦 Archived: ' + strategy.name + ' — ' + reason);
}
function scoreFromMetrics(wr, ret) {
  return Math.round((parseFloat(wr) * 0.6 + Math.max(0, parseFloat(ret)) * 0.4) * 10) / 10;
}
function getCurrentStrategyScore() {
  try {
    const active  = JSON.parse(fs.readFileSync(path.join(BASE, 'reasoning-bot/active_strategy.json'), 'utf8'));
    const stratId = active.strategy;
    const content = fs.readFileSync(path.join(BASE, 'reasoning-bot/strategy_selector.js'), 'utf8');
    let wr = 0, ret = 0;
    const lines = content.split('\n');
    let inStrategy = false;
    for (const line of lines) {
      if (line.includes("'" + stratId + "'")) inStrategy = true;
      if (inStrategy) {
        const wrM  = line.match(/"win_rate":\s*"([\d.]+)%"/);
        const retM = line.match(/"backtest_return":\s*"([+-]?[\d.]+)%"/);
        if (wrM)  wr  = parseFloat(wrM[1]);
        if (retM) ret = parseFloat(retM[1]);
        if (line.trim() === '}' && wr > 0) break;
      }
    }
    return { id: stratId, name: active.name, score: scoreFromMetrics(wr, ret), wr, ret };
  } catch (e) { return { id: null, name: 'Unknown', score: 0 }; }
}
function triggerForge() {
  console.log('\n   ⚙️  Triggering Forge auto loop...');
  try {
    const output = execSync('cd ' + BASE + ' && node forge_auto.js 5', { encoding: 'utf8', timeout: 300000 });
    const passed = output.includes('SUCCESS');
    const nameLine = output.match(/\u2192 (.+)/);
    const wrLine   = output.match(/([\d.]+)%\s*WR/i);
    const retLine  = output.match(/([+-][\d.]+)%\s*return/i);
    if (passed && nameLine && wrLine && retLine) {
      return { passed: true, name: nameLine[1].trim(), wr: parseFloat(wrLine[1]), ret: parseFloat(retLine[1]), score: scoreFromMetrics(wrLine[1], retLine[1]) };
    }
    return { passed: false };
  } catch (e) {
    console.log('   ❌ Forge loop error: ' + e.message);
    return { passed: false, error: e.message };
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function watch() {
  console.log('\n' + '═'.repeat(50));
  console.log('📉 REGIME WATCHER');
  console.log('═'.repeat(50));
  console.log('   Threshold: ' + REGIME_THRESHOLD + ' consecutive days in new regime');

  const candles = await loadCandles(200);
  if (!candles.length) { console.log('   ⚠️  No candle data available'); return; }

  const last3 = [];
  for (let i = 2; i >= 0; i--) {
    const slice = candles.slice(0, candles.length - i);
    last3.push({ regime: calcRegime(slice), date: new Date(candles[candles.length - 1 - i].timestamp * 1000).toISOString().slice(0,10) });
  }

  console.log('\n   📊 Last 3 daily regimes:');
  last3.forEach(d => console.log('   ' + d.date + ' — ' + d.regime));

  const state = loadState();
  const todayRegime = last3[2].regime;
  const allSame = last3.every(d => d.regime === todayRegime);
  const changed = todayRegime !== state.current_regime && state.current_regime !== 'UNKNOWN';

  console.log('\n   💾 Stored regime: ' + state.current_regime);
  console.log('   📅 Today regime:  ' + todayRegime);

  if (!allSame) {
    console.log('   ⏳ Regime not stable for 3 days yet — watching');
    state.last_checked = new Date().toISOString();
    saveState(state);
    return;
  }

  if (!changed) {
    console.log('   ✅ Regime stable — no change');
    state.current_regime = todayRegime;
    state.last_checked = new Date().toISOString();
    saveState(state);
    return;
  }

  console.log('\n   🚨 REGIME CHANGE: ' + state.current_regime + ' to ' + todayRegime);
  console.log('   ⚡ Stable 3 days. Generating new strategy...');

  const current = getCurrentStrategyScore();
  console.log('   🧠 Current strategy: ' + current.name + ' (score: ' + current.score + ')');
  const result = triggerForge();

  if (!result.passed) {
    console.log('   ⚠️  Forge did not produce a passing strategy — keeping current');
  } else {
    console.log('   ✨ New strategy: ' + result.name + ' (score: ' + result.score + ')');
    if (result.score > current.score) {
      console.log('   🏆 New strategy wins (' + result.score + ' vs ' + current.score + ') — replaced in pool');
    } else {
      console.log('   🗑️  New strategy loses (' + result.score + ' vs ' + current.score + ') — archiving');
      archiveStrategy({ name: result.name, score: result.score, regime: todayRegime },
        'Lower score than current (' + result.score + ' vs ' + current.score + ')');
    }
  }

  state.current_regime = todayRegime;
  state.last_trigger = new Date().toISOString();
  state.last_checked = new Date().toISOString();
  saveState(state);
  console.log('\n' + '═'.repeat(50));
}

watch().catch(console.error);
