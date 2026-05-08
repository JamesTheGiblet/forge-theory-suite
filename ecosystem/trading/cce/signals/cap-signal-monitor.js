/**
 * CCE Capitulation Signal Monitor
 * Giblets Creations · cce-cap-signal
 *
 * Evaluates the 4-condition BTC capitulation signal every hour.
 * Writes current score + multiplier to ~/cce/signals/state.json
 * for CCE to read at entry decision time.
 *
 * Signal Conditions:
 *   1. Fear & Greed Index < 25         (Extreme Fear)
 *   2. BTC Dominance 7d change < -1.5% (Broad sell-off)
 *   3. Bear Structure: Price < MA200 AND MA50 < MA200 (Death Cross)
 *   4. Not Overextended: Price within 30% below MA200
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
  stateFile:     path.join(process.env.HOME, 'cce', 'signals', 'state.json'),
  logFile:       path.join(process.env.HOME, 'cce', 'signals', 'cap-signal.log'),
  intervalMs:    60 * 60 * 1000,   // 1 hour
  ma200Period:   200,
  ma50Period:    50,
  domWindow:     7,                 // days for dominance change calc

  thresholds: {
    fearGreed:       25,    // below this = Extreme Fear
    dominance7dDrop: -1.5,  // % change to confirm broad sell-off
    overextended:    -0.30, // max % below MA200 before signal is void
  },

  multipliers: {
    4: 3.0,
    3: 2.0,
    2: 1.5,
    1: 1.0,
    0: 1.0,
  },
};

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'CCE-Cap-Signal/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

// ─── Data fetchers ───────────────────────────────────────────────────────────

async function fetchFearGreed() {
  const data = await fetchJson('https://api.alternative.me/fng/?limit=1&format=json');
  const value = parseInt(data.data[0].value, 10);
  const label = data.data[0].value_classification;
  return { value, label };
}

async function fetchBTCDominanceDelta() {
  // Fetch current dominance from free /global endpoint
  const globalData = await fetchJson('https://api.coingecko.com/api/v3/global');
  const currentDom = globalData.data.market_cap_percentage.btc;

  // Historical dominance via local file — we record one reading per day (keyed by date)
  // and derive the 7d delta from accumulated readings. Needs 7 days to warm up;
  // until then, condition 2 is marked as insufficient_data (treated as NOT met).
  const histFile = path.join(process.env.HOME, 'cce', 'signals', 'dom-history.json');
  const todayKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  let history = {};
  try { history = JSON.parse(fs.readFileSync(histFile, 'utf8')); } catch (_) {}

  // Store today's reading (overwrite if already written today — last reading wins)
  history[todayKey] = currentDom;

  // Prune entries older than 10 days to keep the file small
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 10);
  for (const key of Object.keys(history)) {
    if (new Date(key) < cutoff) delete history[key];
  }

  fs.writeFileSync(histFile, JSON.stringify(history, null, 2));

  // Find the reading closest to 7 days ago
  const target7d = new Date();
  target7d.setDate(target7d.getDate() - 7);
  const target7dKey = target7d.toISOString().slice(0, 10);

  const availableKeys = Object.keys(history).sort();

  // Look for exact 7d match, then nearest available key at or before target
  const pastKey = availableKeys
    .filter(k => k <= target7dKey)
    .slice(-1)[0];

  if (!pastKey) {
    const daysRecorded = availableKeys.length;
    log(`WARN: Dominance history warming up (${daysRecorded}/7 days) — C2 marked insufficient`);
    return { current: currentDom, sevenDayAgo: null, delta: null, insufficient: true };
  }

  const dom7dAgo = history[pastKey];
  const delta    = currentDom - dom7dAgo;

  return { current: currentDom, sevenDayAgo: dom7dAgo, delta, pastKey, insufficient: false };
}

async function fetchBTCOHLC() {
  // CoinGecko daily closes — need 200 days minimum
  const data = await fetchJson(
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=220&interval=daily'
  );

  const prices = data.prices.map(p => p[1]); // [price, price, ...]
  return prices;
}

// ─── Indicator calculations ───────────────────────────────────────────────────

function sma(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function evaluateSignal({ fearGreed, dominanceDelta, prices }) {
  const currentPrice = prices[prices.length - 1];
  const ma200 = sma(prices, CONFIG.ma200Period);
  const ma50  = sma(prices, CONFIG.ma50Period);

  if (!ma200 || !ma50) {
    throw new Error('Insufficient price history for MA calculation');
  }

  const pctFromMA200 = (currentPrice - ma200) / ma200; // negative = below

  const conditions = {
    c1_extremeFear: {
      name:   'Extreme Fear (F&G < 25)',
      met:    fearGreed.value < CONFIG.thresholds.fearGreed,
      detail: `F&G = ${fearGreed.value} (${fearGreed.label})`,
    },
    c2_dominanceDrop: {
      name:   'BTC Dom 7d Drop < -1.5%',
      met:    !dominanceDelta.insufficient && dominanceDelta.delta < CONFIG.thresholds.dominance7dDrop,
      detail: dominanceDelta.insufficient
        ? `Warming up — current dom ${dominanceDelta.current.toFixed(2)}% (need 7d history)`
        : `Dom 7d Δ = ${dominanceDelta.delta.toFixed(2)}% (${dominanceDelta.sevenDayAgo.toFixed(1)}% → ${dominanceDelta.current.toFixed(1)}%)`,
    },
    c3_bearStructure: {
      name:   'Bear Structure (Price < MA200 & Death Cross)',
      met:    currentPrice < ma200 && ma50 < ma200,
      detail: `Price $${currentPrice.toFixed(0)} | MA200 $${ma200.toFixed(0)} | MA50 $${ma50.toFixed(0)}`,
    },
    c4_notOverextended: {
      name:   'Not Overextended (within 30% of MA200)',
      met:    pctFromMA200 >= CONFIG.thresholds.overextended && pctFromMA200 < 0,
      detail: `${(pctFromMA200 * 100).toFixed(1)}% from MA200`,
    },
  };

  const score = Object.values(conditions).filter(c => c.met).length;
  const multiplier = CONFIG.multipliers[score];

  return {
    score,
    multiplier,
    signalActive: score === 4,
    conditions,
    snapshot: {
      btcPrice:     currentPrice,
      ma50:         ma50,
      ma200:        ma200,
      pctFromMA200: pctFromMA200,
      fearGreed:    fearGreed,
      dominance:    dominanceDelta,
    },
  };
}

// ─── State persistence ────────────────────────────────────────────────────────

function writeState(result) {
  const dir = path.dirname(CONFIG.stateFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const state = {
    updatedAt:    new Date().toISOString(),
    score:        result.score,
    multiplier:   result.multiplier,
    signalActive: result.signalActive,
    snapshot:     result.snapshot,
    conditions:   Object.fromEntries(
      Object.entries(result.conditions).map(([k, v]) => [k, { met: v.met, detail: v.detail }])
    ),
  };

  fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
  return state;
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    const dir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(CONFIG.logFile, line + '\n');
  } catch (_) {}
}

function logResult(result) {
  const bar = result.signalActive ? '🔴 SIGNAL ACTIVE' : `Score ${result.score}/4`;
  log(`─── ${bar} ─── Multiplier: ${result.multiplier}x`);
  Object.values(result.conditions).forEach(c => {
    log(`  [${c.met ? '✓' : '✗'}] ${c.name}: ${c.detail}`);
  });
  const s = result.snapshot;
  log(`  BTC $${s.btcPrice.toFixed(0)} | MA50 $${s.ma50.toFixed(0)} | MA200 $${s.ma200.toFixed(0)} | ${(s.pctFromMA200 * 100).toFixed(1)}% from MA200`);
}

// ─── Main cycle ───────────────────────────────────────────────────────────────

async function runCycle() {
  log('=== Cap signal cycle start ===');
  try {
    const [fearGreed, dominanceDelta, prices] = await Promise.all([
      fetchFearGreed(),
      fetchBTCDominanceDelta(),
      fetchBTCOHLC(),
    ]);

    const result = evaluateSignal({ fearGreed, dominanceDelta, prices });
    const state  = writeState(result);

    logResult(result);
    log(`State written → ${CONFIG.stateFile}`);
    return state;

  } catch (err) {
    log(`ERROR: ${err.message}`);
    // Write an error state so CCE knows the monitor is degraded
    const errorState = {
      updatedAt:    new Date().toISOString(),
      score:        null,
      multiplier:   1.0,
      signalActive: false,
      error:        err.message,
    };
    try {
      const dir = path.dirname(CONFIG.stateFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CONFIG.stateFile, JSON.stringify(errorState, null, 2));
    } catch (_) {}
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

(async () => {
  log('cce-cap-signal starting up');
  log(`State file: ${CONFIG.stateFile}`);
  log(`Interval:   ${CONFIG.intervalMs / 60000} minutes`);

  await runCycle(); // run immediately on start

  setInterval(runCycle, CONFIG.intervalMs);
})();
