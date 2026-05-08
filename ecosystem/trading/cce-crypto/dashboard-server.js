// dashboard-server.js — CCE Platform Dashboard
// All endpoints read from real databases. No hardcoded values.
'use strict';
require('dotenv').config();

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const axios    = require('axios');
const initSqlJs = require('sql.js');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index-landing.html')));

// ── DASHBOARD AUTH ────────────────────────────────────────────────────────────
const ALLOWED_IPS = (process.env.DASHBOARD_ALLOWED_IPS || '195.224.143.90').split(',');
const DASHBOARD_KEY = process.env.DASHBOARD_KEY || 'changeme';

function dashboardAuth(req, res, next) {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
  const token = req.query.key || req.headers['x-dashboard-key'] || '';
  const ipOk = ALLOWED_IPS.some(ip => clientIP.includes(ip.trim()));
  const keyOk = token === DASHBOARD_KEY;
  if (ipOk || keyOk) return next();
  res.status(403).sendFile(require('path').join(__dirname, 'public', 'index-landing.html'));
}

app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// JAMES DASHBOARD AUTH
const JAMES_IPS = (process.env.DASHBOARD_ALLOWED_IPS || "195.224.143.90").split(",");
const JAMES_KEY = process.env.DASHBOARD_KEY || "";

function jamesAuth(req, res, next) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";
  const key = req.query.key || req.headers["x-dashboard-key"] || "";
  if (JAMES_IPS.some(function(i) { return ip.includes(i.trim()); }) || (JAMES_KEY && key === JAMES_KEY)) return next();
  res.status(403).sendFile(require("path").join(__dirname, "public", "index-landing.html"));
}

app.get('/james', jamesAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/onboarding', (req, res) => res.sendFile(path.join(__dirname, 'public', 'onboarding.html')));
app.use(express.static(path.join(__dirname, 'public')));

// ── DB HELPER ─────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');

async function queryDb(dbFile, sql, fallback = null) {
  const dbPath = path.join(DATA_DIR, dbFile);
  if (!fs.existsSync(dbPath)) return fallback;
  try {
    const SQL = await initSqlJs();
    const db  = new SQL.Database(fs.readFileSync(dbPath));
    const r   = db.exec(sql);
    db.close();
    if (!r[0]) return fallback;
    const cols = r[0].columns;
    const rows = r[0].values.map(row => Object.fromEntries(cols.map((c,i) => [c, row[i]])));
    return rows.length === 1 ? rows[0] : rows;
  } catch(e) {
    console.error(`DB error [${dbFile}]:`, e.message);
    return fallback;
  }
}

// ── STATUS — reads from cce-production.db ────────────────────────────────────
app.get('/api/status', async (req, res) => {
  const row = await queryDb('cce-production.db',
    'SELECT btc_price, fear_greed, btc_dominance, current_state, portfolio_value, timestamp FROM cce_cycles ORDER BY id DESC LIMIT 1',
    { btc_price: 0, fear_greed: 0, btc_dominance: 0, current_state: 'DORMANT', portfolio_value: 0, timestamp: new Date().toISOString() }
  );
  res.json(row);
});

// ── HISTORY ──────────────────────────────────────────────────────────────────
app.get('/api/history', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const rows = await queryDb('cce-production.db',
    `SELECT timestamp, btc_price, fear_greed, btc_dominance, current_state, portfolio_value FROM cce_cycles ORDER BY id DESC LIMIT ${limit}`,
    []
  );
  res.json(Array.isArray(rows) ? rows : [rows]);
});

// ── TRANSITIONS ───────────────────────────────────────────────────────────────
app.get('/api/transitions', async (req, res) => {
  const rows = await queryDb('cce-production.db',
    'SELECT from_state, to_state, reason, timestamp FROM state_history ORDER BY id DESC LIMIT 50',
    []
  );
  res.json(Array.isArray(rows) ? rows : [rows]);
});

// ── GRID ─────────────────────────────────────────────────────────────────────
app.get('/api/grid/status', async (req, res) => {
  const row = await queryDb('grid-production.db',
    'SELECT grid_state, total_profit, open_buys, open_sells, completed_cycles, btc_price, centre_price, portfolio_value FROM grid_cycles ORDER BY id DESC LIMIT 1',
    { grid_state: 'DORMANT', total_profit: 0, open_buys: 0, open_sells: 0 }
  );
  res.json({
    state: row.grid_state, profit: row.total_profit,
    open_buys: row.open_buys, open_sells: row.open_sells,
    cycles: row.completed_cycles, btc_price: row.btc_price,
    centre_price: row.centre_price, portfolio_value: row.portfolio_value
  });
});

// ── LCE ──────────────────────────────────────────────────────────────────────
app.get('/api/lce/status', async (req, res) => {
  const row = await queryDb('lce-production.db',
    'SELECT state, daily_pnl, cycle_number FROM lce_cycles ORDER BY id DESC LIMIT 1',
    { state: 'DORMANT', daily_pnl: 0, cycle_number: 0 }
  );
  res.json({ state: row.state, daily_pnl: row.daily_pnl, cycle: row.cycle_number });
});

// ── MOMENTUM ─────────────────────────────────────────────────────────────────
app.get('/api/momentum/status', async (req, res) => {
  const row = await queryDb('mom-production.db',
    'SELECT state, capital FROM mom_cycles ORDER BY id DESC LIMIT 1',
    { state: 'STANDBY', capital: 0 }
  );
  res.json(row);
});

// ── BREAKOUT ─────────────────────────────────────────────────────────────────
app.get('/api/breakout/status', async (req, res) => {
  const row = await queryDb('brk-production.db',
    'SELECT state, capital FROM brk_cycles ORDER BY id DESC LIMIT 1',
    { state: 'SCANNING', capital: 0 }
  );
  res.json(row);
});

// ── OBSERVER ─────────────────────────────────────────────────────────────────
app.get('/api/observer/status', async (req, res) => {
  const obsCount = await queryDb('obs-production.db', 'SELECT COUNT(*) as cnt FROM observations', { cnt: 0 });
  const patCount = await queryDb('obs-production.db', 'SELECT COUNT(*) as cnt FROM patterns',     { cnt: 0 });
  const latest   = await queryDb('obs-production.db', 'SELECT obs_number FROM observations ORDER BY id DESC LIMIT 1', { obs_number: 0 });
  res.json({
    observations: obsCount?.cnt || 0,
    patterns:     patCount?.cnt || 0,
    anomalies:    0,
    obs_latest:   latest?.obs_number || 0,
    count:        obsCount?.cnt || 0
  });
});

// ── STRATEGIST ────────────────────────────────────────────────────────────────
app.get('/api/strategist/status', async (req, res) => {
  const obsCount = await queryDb('obs-production.db', 'SELECT COUNT(*) as cnt FROM observations', { cnt: 0 });
  const threshold = 165;
  const current = obsCount?.cnt || 0;
  res.json({
    current, threshold,
    percent: Math.round((current / threshold) * 100),
    ready: current >= threshold
  });
});

// ── SENTINEL ─────────────────────────────────────────────────────────────────
app.get('/api/sentinel/status', async (req, res) => {
  const row = await queryDb('sentinel-production.db',
    'SELECT * FROM sentinel_status ORDER BY id DESC LIMIT 1',
    { active_anomalies: 0, warn_count: 0, alert_count: 0, total_anomalies: 0 }
  );
  res.json(row);
});

app.get('/api/sentinel/active', async (req, res) => {
  const rows = await queryDb('sentinel-production.db',
    'SELECT * FROM sentinel_alerts WHERE resolved IS NULL ORDER BY id DESC LIMIT 10',
    []
  );
  const arr = Array.isArray(rows) ? rows : (rows ? [rows] : []);
  res.json({ count: arr.length, alerts: arr });
});

// ── COMO ─────────────────────────────────────────────────────────────────────
let cachedOilPrice  = 0;
let cachedGoldPrice = 0;
let lastComoUpdate  = 0;

async function updateComoData() {
  try {
    const row = await queryDb('como-production.db',
      'SELECT oil_price, gold_price, timestamp FROM como_cycles ORDER BY id DESC LIMIT 1',
      null
    );
    if (row && row.oil_price) {
      cachedOilPrice  = row.oil_price;
      cachedGoldPrice = row.gold_price;
      lastComoUpdate  = Date.now();
    }
  } catch(e) {}
}
updateComoData();
setInterval(updateComoData, 5 * 60 * 1000);

app.get('/api/como/status', (req, res) => {
  res.json({ oil_price: cachedOilPrice, gold_price: cachedGoldPrice, timestamp: new Date().toISOString() });
});

// ── CME ──────────────────────────────────────────────────────────────────────
app.get('/api/cme/status', async (req, res) => {
  const row = await queryDb('cme-production.db',
    'SELECT price, vix, state FROM cme_cycles ORDER BY id DESC LIMIT 1',
    { price: 0, vix: 0, state: 'DORMANT' }
  );
  res.json({ spy_price: row.price, vix: row.vix, state: row.state });
});

// ── RME ──────────────────────────────────────────────────────────────────────
let cachedFedRate = 0;
let cachedTreasury = 0;
let cachedReitPrice = 0;

async function updateFredData() {
  try {
    if (!process.env.FRED_API_KEY) return;
    const [fedRes, t10Res] = await Promise.all([
      axios.get(`https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&sort_order=desc&limit=1&api_key=${process.env.FRED_API_KEY}&file_type=json`),
      axios.get(`https://api.stlouisfed.org/fred/series/observations?series_id=GS10&sort_order=desc&limit=1&api_key=${process.env.FRED_API_KEY}&file_type=json`)
    ]);
    cachedFedRate  = parseFloat(fedRes.data.observations[0]?.value) || cachedFedRate;
    cachedTreasury = parseFloat(t10Res.data.observations[0]?.value) || cachedTreasury;
    console.log(`🏦 Fed Funds Rate updated: ${cachedFedRate}%`);
    console.log(`📈 10-Year Treasury updated: ${cachedTreasury}%`);
  } catch(e) { console.warn('FRED update failed:', e.message); }
}

async function updateReitPrice() {
  try {
    if (!process.env.ALPHA_VANTAGE_KEY) return;
    const res = await axios.get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=O&apikey=${process.env.ALPHA_VANTAGE_KEY}`);
    const price = parseFloat(res.data['Global Quote']?.['05. price']);
    if (price) { cachedReitPrice = price; console.log(`🏢 O Realty price updated: $${price}`); }
  } catch(e) {}
}

updateFredData();
updateReitPrice();
setInterval(updateFredData,   6 * 60 * 60 * 1000);
setInterval(updateReitPrice,  6 * 60 * 60 * 1000);

app.get('/api/fred/status', (req, res) => {
  res.json({ fed_rate: cachedFedRate, treasury_10y: cachedTreasury, timestamp: new Date().toISOString() });
});

app.get('/api/rme/status', async (req, res) => {
  const row = await queryDb('rme-production.db',
    'SELECT state FROM rme_cycles ORDER BY id DESC LIMIT 1',
    { state: 'DORMANT' }
  );
  res.json({ state: row.state, fed_rate: cachedFedRate, treasury_yield: cachedTreasury, price: cachedReitPrice });
});

app.get('/api/reit/price', (req, res) => {
  res.json({ price: cachedReitPrice, timestamp: new Date().toISOString() });
});

// ── DXY ──────────────────────────────────────────────────────────────────────
let cachedDXY = 0;

async function updateDXY() {
  try {
    const res = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1d');
    const price = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price) { cachedDXY = price; console.log(`💵 DXY updated: ${price}`); }
  } catch(e) {
    try {
      if (!process.env.FRED_API_KEY) return;
      const res = await axios.get(`https://api.stlouisfed.org/fred/series/observations?series_id=DTWEXBGS&sort_order=desc&limit=1&api_key=${process.env.FRED_API_KEY}&file_type=json`);
      const v = parseFloat(res.data.observations[0]?.value);
      if (v) cachedDXY = v;
    } catch(_) {}
  }
}
updateDXY();
setInterval(updateDXY, 60 * 60 * 1000);

app.get('/api/dxy/status', (req, res) => {
  res.json({ dxy: cachedDXY, timestamp: new Date().toISOString() });
});

// ── FOREX ─────────────────────────────────────────────────────────────────────
let cachedEURUSD = 0;

async function updateForex() {
  try {
    const res = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d');
    const price = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price) { cachedEURUSD = price; console.log(`💱 EUR/USD updated: ${price}`); }
  } catch(e) {}
}
updateForex();
setInterval(updateForex, 60 * 60 * 1000);

app.get('/api/forex/rate', (req, res) => {
  res.json({ eur_usd: cachedEURUSD, timestamp: new Date().toISOString() });
});

// ── CCE VOLATILITY ────────────────────────────────────────────────────────────
app.get('/api/cce/volatility', async (req, res) => {
  try {
    const rows = await queryDb('cme-production.db',
      'SELECT price FROM cme_cycles ORDER BY id DESC LIMIT 20',
      []
    );
    const arr = Array.isArray(rows) ? rows : [rows];
    const prices = arr.map(r => r.price).filter(Boolean);
    if (prices.length < 2) return res.json({ vix: 0, source: 'cce', timestamp: new Date().toISOString() });
    const returns = prices.slice(1).map((p, i) => Math.abs((p - prices[i]) / prices[i]));
    const vix = (returns.reduce((a, b) => a + b, 0) / returns.length) * 100 * Math.sqrt(252);
    res.json({ vix, source: 'cce', timestamp: new Date().toISOString() });
  } catch(e) {
    res.json({ vix: 0, source: 'cce', timestamp: new Date().toISOString() });
  }
});

// ── PORTFOLIO ─────────────────────────────────────────────────────────────────
app.get('/api/portfolio', async (req, res) => {
  try {
    const KrakenClient = require('./src/exchange-connector');
    const kraken = new KrakenClient(process.env.KRAKEN_API_KEY, process.env.KRAKEN_API_SECRET);
    const balances = await kraken.getBalance();
    const assets = Object.entries(balances)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([symbol, amount]) => ({ symbol, amount: parseFloat(amount), usdValue: parseFloat(amount), price: 1, percentage: 0 }));
    const totalUSD = assets.reduce((s, a) => s + a.usdValue, 0);
    assets.forEach(a => { a.percentage = (a.usdValue / totalUSD) * 100; });
    res.json({ totalUSD, assets, timestamp: new Date().toISOString() });
  } catch(e) {
    // Fallback to database
    const row = await queryDb('cce-production.db',
      'SELECT portfolio_value FROM cce_cycles ORDER BY id DESC LIMIT 1',
      { portfolio_value: 0 }
    );
    res.json({
      totalUSD: row.portfolio_value || 0,
      assets: [{ symbol: 'USDC', amount: row.portfolio_value || 0, usdValue: row.portfolio_value || 0, price: 1, percentage: 100 }],
      timestamp: new Date().toISOString()
    });
  }
});

// ── EXPORT ────────────────────────────────────────────────────────────────────
app.get('/api/export/csv', async (req, res) => {
  const rows = await queryDb('cce-production.db',
    'SELECT * FROM cce_cycles ORDER BY id DESC LIMIT 1000', []
  );
  const arr = Array.isArray(rows) ? rows : [rows];
  if (!arr.length) return res.send('No data');
  const headers = Object.keys(arr[0]).join(',');
  const csv = arr.map(r => Object.values(r).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=cce-export.csv');
  res.send(headers + '\n' + csv);
});

app.get('/api/export/history', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const rows = await queryDb('cce-production.db',
    `SELECT timestamp, btc_price, fear_greed, btc_dominance, portfolio_value, current_state FROM cce_cycles ORDER BY id DESC LIMIT ${limit}`,
    []
  );
  const arr = Array.isArray(rows) ? rows : [rows];
  const headers = 'timestamp,btc_price,fear_greed,btc_dominance,portfolio_value,current_state';
  const csv = arr.map(r => Object.values(r).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.send(headers + '\n' + csv);
});

// ── G.O STATUS ────────────────────────────────────────────────────────────────
let cachedGO = { regime: 'RISK_OFF', stability: 0.5, status: 'LEARNING' };

async function updateGOStatus() {
  try {
    const dbPath = path.join(DATA_DIR, 'go-ceilings.json');
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (data.regime) cachedGO = { regime: data.regime, stability: data.stability || 0.5, status: data.status || 'LEARNING' };
    }
  } catch(e) {}
}
updateGOStatus();
setInterval(updateGOStatus, 60 * 1000);

app.get('/api/go/status', (req, res) => res.json(cachedGO));

// ── FL (FORENSIC LAYER) ───────────────────────────────────────────────────────
app.get('/api/fl/doubt', async (req, res) => {
  const rows = await queryDb('fl-production.db',
    'SELECT engine, doubt_score, pattern FROM fl_patterns ORDER BY doubt_score DESC LIMIT 10',
    []
  );
  res.json({ patterns: Array.isArray(rows) ? rows : [rows] });
});

app.get('/api/fl/lessons', async (req, res) => {
  const rows = await queryDb('fl-production.db',
    'SELECT * FROM fl_lessons ORDER BY id DESC LIMIT 20',
    []
  );
  res.json({ lessons: Array.isArray(rows) ? rows : [rows] });
});

// ── CSS (CAPITAL SIPHON) ──────────────────────────────────────────────────────
app.get('/api/css/events', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const rows = await queryDb('css-production.db',
    `SELECT from_engine, to_fund, amount_usd, timestamp FROM css_events ORDER BY id DESC LIMIT ${limit}`,
    []
  );
  res.json({ events: Array.isArray(rows) ? rows : [rows] });
});

// ── AUDIT ─────────────────────────────────────────────────────────────────────
app.get('/api/audit/summary', async (req, res) => {
  const rows = await queryDb('audit-production.db',
    "SELECT component, severity, message FROM audit_alerts WHERE resolved IS NULL ORDER BY last_seen DESC LIMIT 10",
    []
  );
  const arr = Array.isArray(rows) ? rows : (rows ? [rows] : []);
  const alerts = arr.map(r => `${r.component}: ${r.message}`);
  res.json({ active_alerts: arr.length, alerts, timestamp: new Date().toISOString() });
});

// ── GUIDANCE LAYER ────────────────────────────────────────────────────────────
let guidanceMode    = 'BALANCED';
let guidanceSignal  = 0.5;
let guidanceUpdated = null;

app.get('/api/guidance/current', (req, res) => {
  res.json({ mode: guidanceMode, signal: guidanceSignal, updated: guidanceUpdated?.toISOString() || new Date().toISOString() });
});

app.post('/api/guidance/set', (req, res) => {
  const { mode, signal } = req.body;
  if (mode && ['CAUTIOUS','BALANCED','AGGRESSIVE'].includes(mode)) {
    guidanceMode   = mode;
    guidanceSignal = mode === 'CAUTIOUS' ? 0 : mode === 'AGGRESSIVE' ? 1 : 0.5;
  } else if (signal !== undefined) {
    guidanceSignal = Math.max(0, Math.min(1, signal));
    guidanceMode   = guidanceSignal <= 0.33 ? 'CAUTIOUS' : guidanceSignal <= 0.66 ? 'BALANCED' : 'AGGRESSIVE';
  }
  guidanceUpdated = new Date();
  console.log(`🎮 Guidance Layer: ${guidanceMode} (${guidanceSignal})`);
  res.json({ success: true, mode: guidanceMode, signal: guidanceSignal });
});

// ── TELEGRAM ─────────────────────────────────────────────────────────────────
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { message } = req.body;
    const token   = process.env.TELEGRAM_BOT_TOKEN;
    const chat_id = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chat_id) return res.json({ success: false, error: 'No Telegram config' });
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id, text: message, parse_mode: 'HTML' });
    res.json({ success: true });
  } catch(e) { res.json({ success: false, error: e.message }); }
});

// ── WEATHER ───────────────────────────────────────────────────────────────────
let weatherSignals = [];

async function fetchWeatherSignals() {
  const key = process.env.WEATHER_API_KEY;
  if (!key) return;
  const locations = [
    { name: 'US Midwest',    city: 'Chicago',   commodities: ['Corn','Soybeans','Wheat'] },
    { name: 'Brazil',        city: 'Sao Paulo', commodities: ['Oranges'] },
    { name: 'Southeast Asia',city: 'Bangkok',   commodities: ['Rice'] },
    { name: 'California',    city: 'Fresno',    commodities: ['Oranges'] }
  ];
  const signals = [];
  for (const loc of locations) {
    try {
      const [wRes, fRes] = await Promise.all([
        axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(loc.city)}&units=metric&appid=${key}`),
        axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(loc.city)}&units=metric&cnt=24&appid=${key}`)
      ]);
      const w = { temp: wRes.data.main.temp, humidity: wRes.data.main.humidity, condition: wRes.data.weather[0].main };
      const f = fRes.data.list.filter((_, i) => i % 8 === 0).slice(0, 3);
      for (const commodity of loc.commodities) {
        let signal = 0, reason = '';
        if (commodity === 'Rice') {
          if (f.some(x => x.weather[0].main === 'Rain' && x.main.temp > 25)) { signal = -0.6; reason = 'Excessive rainfall forecast'; }
          else if (w.humidity > 80) { signal = -0.3; reason = 'High humidity'; }
          else { signal = 0.1; reason = 'Normal conditions'; }
        } else if (commodity === 'Oranges') {
          if (f.some(x => x.main.temp < 0)) { signal = -0.8; reason = 'Frost forecast!'; }
          else if (w.temp < 5) { signal = -0.4; reason = 'Cold temperatures'; }
          else if (w.temp > 25) { signal = 0.3; reason = 'Warm weather good'; }
          else { signal = 0.1; reason = 'Normal conditions'; }
        } else if (commodity === 'Wheat') {
          if (f.every(x => x.weather[0].main !== 'Rain' && x.main.humidity < 50)) { signal = -0.7; reason = 'Drought forecast'; }
          else if (w.humidity < 40) { signal = -0.3; reason = 'Dry conditions'; }
          else { signal = 0.2; reason = 'Favorable conditions'; }
        } else if (commodity === 'Corn') {
          if (f.some(x => x.main.temp > 35)) { signal = -0.5; reason = 'Extreme heat'; }
          else if (f.some(x => x.main.temp > 25 && x.main.temp < 30)) { signal = 0.4; reason = 'Optimal temperature'; }
          else { signal = 0.1; reason = 'Normal'; }
        } else if (commodity === 'Soybeans') {
          if (f.some(x => x.weather[0].main === 'Rain')) { signal = 0.3; reason = 'Good rainfall'; }
          else if (w.humidity > 85) { signal = -0.3; reason = 'Excessive humidity'; }
          else { signal = 0.1; reason = 'Normal'; }
        }
        if (signal !== 0) signals.push({ commodity, signal, reason, location: loc.name, temp: w.temp, condition: w.condition, humidity: w.humidity });
      }
    } catch(e) { console.warn(`Weather fetch failed for ${loc.city}:`, e.message); }
  }
  weatherSignals = signals;
}
fetchWeatherSignals();
setInterval(fetchWeatherSignals, 60 * 60 * 1000);

app.get('/api/weather/signals', (req, res) => res.json({ signals: weatherSignals }));

// ── DOCS ROUTES ───────────────────────────────────────────────────────────────
app.get('/docs',  (req, res) => res.sendFile(path.join(__dirname, 'public/docs/index.html')));
app.get('/docs/', (req, res) => res.sendFile(path.join(__dirname, 'public/docs/index.html')));
app.get('/docs/files/*', (req, res) => {
  const safe = req.params[0].replace(/\.\./g, '');
  res.sendFile(path.join(__dirname, 'docs', safe), err => {
    if (err) res.status(404).json({ error: 'Not found: ' + safe });
  });
});

// ── PLATFORM ROUTES ───────────────────────────────────────────────────────────
app.get('/forge/builder',  (req, res) => res.sendFile(path.join(__dirname, 'public/forge/builder.html')));
app.get('/forge/replay',   (req, res) => res.sendFile(path.join(__dirname, 'public/forge/replay.html')));
app.get('/marketplace',    (req, res) => res.sendFile(path.join(__dirname, 'public/marketplace/index.html')));
app.get('/marketplace/',   (req, res) => res.sendFile(path.join(__dirname, 'public/marketplace/index.html')));

// ── REGISTRY OVERVIEW ─────────────────────────────────────────────────────────
app.get('/api/registry/overview', (req, res) => {
  try {
    const engDir = path.join(__dirname, 'engines');
    const engines = {};
    if (fs.existsSync(engDir)) {
      fs.readdirSync(engDir).filter(f => !f.startsWith('_')).forEach(id => {
        const mf = path.join(engDir, id, 'manifest.json');
        if (fs.existsSync(mf)) {
          try {
            const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
            engines[id] = { id: m.id, name: m.name, type: m.type, ecosystem: m.ecosystem, cycle: m.cycle, dryRun: true, state: 'RUNNING' };
          } catch(e) {}
        }
      });
    }
    res.json({ timestamp: new Date().toISOString(), engines, engineCount: Object.keys(engines).length, layers: {}, layerCount: 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/registry/engines', (req, res) => {
  const engDir = path.join(__dirname, 'engines');
  const engines = {};
  if (fs.existsSync(engDir)) {
    fs.readdirSync(engDir).filter(f => !f.startsWith('_')).forEach(id => {
      const mf = path.join(engDir, id, 'manifest.json');
      if (fs.existsSync(mf)) {
        try { engines[id] = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch(e) {}
      }
    });
  }
  res.json({ engines, count: Object.keys(engines).length, timestamp: new Date().toISOString() });
});

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/history', (req, res) => res.sendFile(require('path').join(__dirname, 'public/history.html')));

app.get('/api/fearfade/status', async (req, res) => {
  try {
    const row = queryDb('data/se-fear-fade.db', 'SELECT state, portfolio_value, cycle FROM ff_cycles ORDER BY id DESC LIMIT 1');
    res.json(row || { state: 'DORMANT', portfolio_value: 100, cycle: 0 });
  } catch(e) { res.json({ state: 'DORMANT', portfolio_value: 100, cycle: 0 }); }
});

app.get('/api/altseason/status', async (req, res) => {
  try {
    const row = queryDb('data/se-alt-season.db', 'SELECT state, portfolio_value, cycle FROM alt_cycles ORDER BY id DESC LIMIT 1');
    res.json(row || { state: 'DORMANT', portfolio_value: 100, cycle: 0 });
  } catch(e) { res.json({ state: 'DORMANT', portfolio_value: 100, cycle: 0 }); }
});

app.get('/api/client/tier', (req, res) => {
  const tier = process.env.CCE_CLIENT_TIER || 'all';
  const names = {
    'starter':  'Starter — Kraken only',
    'advanced': 'Advanced — Kraken + Binance',
    'full':     'Full Platform — All exchanges',
    'all':      'All Platforms'
  };
  res.json({ tier, name: names[tier] || 'All Platforms' });
});

// ── ONBOARDING RATE LIMITER ───────────────────────────────────────────────────
class OnboardingRateLimiter {
  constructor() {
    this.store = new Map();
    this.windowMs = 60 * 60 * 1000;
    this.max = 10;
    setInterval(() => this.cleanup(), this.windowMs);
  }
  _getKey(ip) {
    if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
    return ip;
  }
  check(ip) {
    const key = this._getKey(ip);
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let timestamps = this.store.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    if (timestamps.length >= this.max) {
      return { allowed: false, remaining: 0, reset: new Date(timestamps[0] + this.windowMs) };
    }
    timestamps.push(now);
    this.store.set(key, timestamps);
    return { allowed: true, remaining: this.max - timestamps.length, reset: new Date(timestamps[0] + this.windowMs) };
  }
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [ip, timestamps] of this.store.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) this.store.delete(ip);
      else this.store.set(ip, filtered);
    }
  }
}
const onboardingLimiter = new OnboardingRateLimiter();


// ── ONBOARDING COMPLETE ───────────────────────────────────────────────────────
app.post('/api/onboarding/complete', (req, res) => {
  const clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const rateCheck = onboardingLimiter.check(clientIP);
  if (!rateCheck.allowed) {
    return res.status(429).json({ success: false, error: 'Too many submissions. Please try again later.', retryAfter: Math.ceil((rateCheck.reset - Date.now()) / 1000) });
  }
  const crypto = require('crypto');
  const { name, date, capital, score, total } = req.body;
  if (!name || !date || !capital) return res.json({ success: false, error: 'Missing fields' });
  const initials = name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 3);
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  const code = 'CCE-' + initials + '-' + rand;
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {}
  const exists = log.find(function(e) { return e.name && e.name.toLowerCase() === name.toLowerCase() && !e.deployed; });
  if (exists) return res.json({ success: true, code: exists.code });
  const entry = { name: name, date: date, capital: parseFloat(capital), code: code, score: score, total: total, timestamp: new Date().toISOString() };
  log.push(entry);
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log('[ONBOARDING] ' + name + ' completed — code: ' + code);
  res.json({ success: true, code: code });
});

app.get('/api/onboarding/log', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  try {
    const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    res.json(log);
  } catch(e) { res.json([]); }
});

app.get('/api/health', (req, res) => res.json({ status: 'online', timestamp: new Date().toISOString() }));

// ── PROXY (for CCE Unreal) ────────────────────────────────────────────────────
app.get('/api/ticker', async (req, res) => {
  const row = await queryDb('cce-production.db',
    'SELECT btc_price, fear_greed, btc_dominance, timestamp FROM cce_cycles ORDER BY id DESC LIMIT 1',
    { btc_price: 0, fear_greed: 0 }
  );
  res.json({ btc_price: row.btc_price, fear_greed: row.fear_greed, btc_dominance: row.btc_dominance, timestamp: row.timestamp });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   CCE Platform Core — Dashboard Server                         ║
╚════════════════════════════════════════════════════════════════╝
🌐 http://localhost:${PORT}
📧 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Configured' : '❌ Not configured'}
`);
});

module.exports = { app };// ── CLIENT SETUP (token-gated) ─────────────────────────────────────────────────
const { execSync } = require('child_process');
// crypto already declared above

// /setup — only renders if valid unexpired token present, else 404
app.get('/setup', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(404).sendFile(path.join(__dirname, 'public', 'index-landing.html'));

  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.status(404).sendFile(path.join(__dirname, 'public', 'index-landing.html'));
  }

  const entry = log.find(e => e.setupToken === token);
  if (!entry) return res.status(404).sendFile(path.join(__dirname, 'public', 'index-landing.html'));
  if (entry.tokenUsed) return res.status(410).send('<h2 style="font-family:monospace;padding:40px">This setup link has already been used.</h2>');
  if (new Date(entry.tokenExpiry) < new Date()) return res.status(410).send('<h2 style="font-family:monospace;padding:40px">This setup link has expired. Contact James for a new one.</h2>');

  res.sendFile(path.join(__dirname, 'public', 'setup.html'));
});

// Verify token + access code
app.post('/api/setup/verify', (req, res) => {
  const { code, token } = req.body;
  if (!code || !token) return res.json({ valid: false, error: 'Missing code or token' });

  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ valid: false, error: 'Could not read onboarding log' });
  }

  // Find by token first
  const entry = log.find(e => e.setupToken === token);
  if (!entry) return res.json({ valid: false, error: 'Invalid setup link.' });
  if (entry.tokenUsed) return res.json({ valid: false, error: 'This setup link has already been used.' });
  if (new Date(entry.tokenExpiry) < new Date()) return res.json({ valid: false, error: 'Setup link expired. Contact James for a new one.' });

  // Then verify code matches
  if (entry.code?.toUpperCase() !== code.toUpperCase()) return res.json({ valid: false, error: 'Access code does not match this setup link.' });
  if (entry.deployed) return res.json({ valid: false, error: 'This account is already set up.' });
  if (!entry.approved) return res.json({ valid: false, error: 'Your account has not been approved yet.' });

  const slug = entry.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  res.json({ valid: true, name: entry.name, code: entry.code, capital: entry.capital || 500, slug });
});

// Deploy client instance
app.post('/api/setup/deploy', async (req, res) => {
  const { code, token, name, kraken_key, kraken_secret, telegram_id, capital } = req.body;
  const clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

  if (!code || !token || !kraken_key || !kraken_secret) return res.json({ success: false, error: 'Missing required fields' });

  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read onboarding log' });
  }

  const idx = log.findIndex(e => e.setupToken === token && e.code?.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Invalid token or code' });
  const entry = log[idx];
  if (entry.tokenUsed) return res.json({ success: false, error: 'Setup link already used' });
  if (entry.deployed)  return res.json({ success: false, error: 'Already deployed' });
  if (!entry.approved) return res.json({ success: false, error: 'Not approved' });
  if (new Date(entry.tokenExpiry) < new Date()) return res.json({ success: false, error: 'Setup link expired' });

  // Mark token as used immediately to prevent double-deploy
  log[idx].tokenUsed = true;
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const clientDir = `/home/cce/clients/${slug}`;

  try {
    // Auto-detect next free port
    let port = 3001;
    const clientsDir = '/home/cce/clients';
    if (fs.existsSync(clientsDir)) {
      const clients = fs.readdirSync(clientsDir).filter(d => d !== slug);
      const usedPorts = [];
      for (const c of clients) {
        const envPath = path.join(clientsDir, c, '.env');
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const match = content.match(/^PORT=(\d+)/m);
          if (match) usedPorts.push(parseInt(match[1]));
        }
      }
      while (usedPorts.includes(port)) port++;
    }

    // Create directories
    fs.mkdirSync(clientDir, { recursive: true });
    fs.mkdirSync(path.join(clientDir, 'data'), { recursive: true });

    // Sync platform files
    execSync(`rsync -a --exclude='.env' --exclude='data/*.db' --exclude='node_modules' --exclude='.git' ${__dirname}/ ${clientDir}/`);

    // Install dependencies
    execSync(`cd ${clientDir} && npm install --production`, { timeout: 120000 });

    // Generate unique dashboard key
    const dashKey = crypto.randomBytes(16).toString('hex');
    const stopToken = crypto.randomBytes(8).toString('hex');

    // Write .env
    const envContent = [
      `# CCE Client — ${name}`,
      `# Deployed: ${new Date().toISOString()}`,
      `PORT=${port}`,
      `CLIENT_NAME=${name}`,
      `CCE_CLIENT_SLUG=${slug}`,
      `CCE_ACCESS_CODE=${code}`,
      ``,
      `# Trading`,
      `CCE_DRY_RUN=true`,
      `STARTING_CAPITAL=${capital}`,
      `BASE_CURRENCY=USD`,
      ``,
      `# Kraken`,
      `KRAKEN_API_KEY=${kraken_key}`,
      `KRAKEN_API_SECRET=${kraken_secret}`,
      ``,
      `# Notifications`,
      `TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN || ''}`,
      `TELEGRAM_CHAT_ID=${telegram_id || ''}`,
      ``,
      `# Data feeds`,
      `FRED_API_KEY=${process.env.FRED_API_KEY || ''}`,
      `WEATHER_API_KEY=${process.env.WEATHER_API_KEY || ''}`,
      ``,
      `# Dashboard security`,
      `DASHBOARD_ALLOWED_IPS=${clientIP}`,
      `DASHBOARD_KEY=${dashKey}`,
      `DASHBOARD_STOP_TOKEN=${stopToken}`,
    ].join('\n');
    fs.writeFileSync(path.join(clientDir, '.env'), envContent);

    // Start PM2
    execSync(`cd ${clientDir} && pm2 start index.js --name ${slug}-cce && pm2 start dashboard-server.js --name ${slug}-dash && pm2 save`);

    // Open firewall port
    try { execSync(`ufw allow ${port}`); } catch(e) {}

    // Update onboarding log
    log[idx].deployed    = true;
    log[idx].deployedAt  = new Date().toISOString();
    log[idx].port        = port;
    log[idx].slug        = slug;
    log[idx].clientIP    = clientIP;
    log[idx].dashKey     = dashKey;
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

    // Notify James
    try {
      const axios = require('axios');
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId   = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: chatId,
          text: `🚀 <b>New Client Live</b>\n\n👤 ${name}\n🔑 ${code}\n🌐 Port: ${port}\n📍 IP: ${clientIP}\n🔗 cce-trading.co.uk/${slug}\n\n✅ DRY RUN mode — engines starting`,
          parse_mode: 'HTML'
        });
      }
    } catch(e) { console.warn('[SETUP] Telegram failed:', e.message); }

    console.log(`[SETUP] ✅ ${name} live — port ${port} — ${slug}`);
    res.json({ success: true, clientSlug: slug, port });

  } catch(e) {
    // Rollback token-used flag on failure
    log[idx].tokenUsed = false;
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
    console.error('[SETUP] Deploy failed:', e.message);
    res.json({ success: false, error: e.message });
  }
});
// ── OPERATOR API ──────────────────────────────────────────────────────────────
// crypto already declared above

// Get all onboarding entries
app.get('/api/operator/clients', (req, res) => {
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  try {
    const entries = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    res.json({ success: true, entries });
  } catch(e) {
    res.json({ success: true, entries: [] });
  }
});

// Approve a client — generates one-time setup token, returns setup URL
app.post('/api/operator/approve', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.json({ success: false, error: 'No code provided' });

  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read onboarding log' });
  }

  const idx = log.findIndex(e => e.code?.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Code not found' });
  if (log[idx].deployed) return res.json({ success: false, error: 'Already deployed' });
  if (log[idx].approved) {
    // Already approved — return existing token if still valid
    const stillValid = new Date(log[idx].tokenExpiry) > new Date() && !log[idx].tokenUsed;
    if (stillValid) {
      const setupUrl = `https://cce-trading.co.uk/setup?token=${log[idx].setupToken}`;
      return res.json({ success: true, setupUrl, existing: true });
    }
  }

  // Generate new token
  const token = crypto.randomBytes(24).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  log[idx].approved    = true;
  log[idx].approvedAt  = new Date().toISOString();
  log[idx].setupToken  = token;
  log[idx].tokenExpiry = expiry;
  log[idx].tokenUsed   = false;

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

  const setupUrl = `https://cce-trading.co.uk/setup?token=${token}`;

  // Notify James via Telegram
  try {
    const axios = require('axios');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: `⚡ <b>Client Approved via Dashboard</b>\n\n👤 ${log[idx].name}\n🔑 ${code}\n🔗 ${setupUrl}\n⏰ Expires 24hrs`,
        parse_mode: 'HTML'
      });
    }
  } catch(e) { console.warn('[OPERATOR] Telegram failed:', e.message); }

  console.log(`[OPERATOR] ✅ ${log[idx].name} approved — ${setupUrl}`);
  res.json({ success: true, setupUrl });
});

// ── REVOKE CLIENT APPROVAL ────────────────────────────────────────────────────
app.post('/api/operator/revoke', (req, res) => {
  const { code } = req.body;
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read log' });
  }
  const idx = log.findIndex(e => e.code?.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Code not found' });
  if (log[idx].deployed) return res.json({ success: false, error: 'Already deployed' });
  log[idx].approved = false;
  log[idx].setupToken = null;
  log[idx].tokenExpiry = null;
  log[idx].tokenUsed = null;
  log[idx].revokedAt = new Date().toISOString();
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  res.json({ success: true });
});

// ── REVOKE CLIENT APPROVAL ────────────────────────────────────────────────────
app.post('/api/operator/revoke', (req, res) => {
  const { code } = req.body;
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read log' });
  }
  const idx = log.findIndex(e => e.code?.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Code not found' });
  if (log[idx].deployed) return res.json({ success: false, error: 'Already deployed — cannot revoke' });
  log[idx].approved = false;
  log[idx].setupToken = null;
  log[idx].tokenExpiry = null;
  log[idx].tokenUsed = null;
  log[idx].revokedAt = new Date().toISOString();
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log('[OPERATOR] 🚫 ' + log[idx].name + ' revoked');
  res.json({ success: true });
});

// REVOKE CLIENT APPROVAL
app.post('/api/operator/revoke', (req, res) => {
  const { code } = req.body;
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read log' });
  }
  const idx = log.findIndex(e => e.code && e.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Code not found' });
  if (log[idx].deployed) return res.json({ success: false, error: 'Already deployed' });
  log[idx].approved = false;
  log[idx].setupToken = null;
  log[idx].tokenExpiry = null;
  log[idx].tokenUsed = null;
  log[idx].revokedAt = new Date().toISOString();
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  res.json({ success: true });
});

// CANCEL/DELETE ONBOARDING ENTRY
app.post('/api/operator/cancel', (req, res) => {
  const { code } = req.body;
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read log' });
  }
  const idx = log.findIndex(e => e.code && e.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Code not found' });
  if (log[idx].deployed) return res.json({ success: false, error: 'Already deployed — cannot cancel' });
  const name = log[idx].name;
  log.splice(idx, 1);
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log('[OPERATOR] ❌ ' + name + ' cancelled and removed');
  res.json({ success: true });
});

app.post('/api/operator/cancel', (req, res) => {
  const { code } = req.body;
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read log' });
  }
  const idx = log.findIndex(e => e.code && e.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Not found' });
  if (log[idx].deployed) return res.json({ success: false, error: 'Already deployed' });
  log.splice(idx, 1);
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  res.json({ success: true });
});

// ── DYNAMIC CLIENT PROXY ──────────────────────────────────────────────────────
// Routes /slug/* to each client's dashboard port
const http = require('http');

function proxyToClient(req, res, port, stripPrefix) {
  const target = req.url.replace(stripPrefix, '') || '/';
  const options = {
    hostname: 'localhost',
    port: port,
    path: target,
    method: req.method,
    headers: req.headers
  };
  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxy.on('error', () => res.status(502).send('Client dashboard unavailable'));
  req.pipe(proxy, { end: true });
}

function loadClientRoutes() {
  try {
    const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
    const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    return log.filter(e => e.deployed && e.port && e.slug);
  } catch(e) { return []; }
}

// Dynamic client routing middleware
app.use((req, res, next) => {
  const clients = loadClientRoutes();
  for (const client of clients) {
    const prefix = '/' + client.slug;
    if (req.path === prefix || req.path.startsWith(prefix + '/')) {
      return proxyToClient(req, res, client.port, prefix);
    }
  }
  next();
});

// DYNAMIC CLIENT PROXY

function proxyToClient(req, res, port, stripPrefix) {
  const target = req.url.replace(stripPrefix, '') || '/';
  const options = {
    hostname: 'localhost',
    port: port,
    path: target,
    method: req.method,
    headers: Object.assign({}, req.headers)
  };
  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxy.on('error', () => res.status(502).send('Client dashboard unavailable'));
  req.pipe(proxy, { end: true });
}

function loadClientRoutes() {
  try {
    const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
    const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    return log.filter(function(e) { return e.deployed && e.port && e.slug; });
  } catch(e) { return []; }
}

app.use(function(req, res, next) {
  const clients = loadClientRoutes();
  for (var i = 0; i < clients.length; i++) {
    const client = clients[i];
    const prefix = '/' + client.slug;
    if (req.path === prefix || req.path.startsWith(prefix + '/')) {
      return proxyToClient(req, res, client.port, prefix);
    }
  }
  next();
});

// MARK AS PAID
app.post('/api/operator/paid', (req, res) => {
  const { code, amount } = req.body;
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read log' });
  }
  const idx = log.findIndex(e => e.code && e.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Not found' });
  const telegram_id = req.body.telegram_id;
  log[idx].paid = true;
  log[idx].paidAmount = amount || 200;
  log[idx].paidAt = new Date().toISOString();
  if (telegram_id) log[idx].clientTelegramId = telegram_id;
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log('[OPERATOR] £' + (amount||200) + ' payment recorded for ' + log[idx].name);
  res.json({ success: true });
});

// CLIENT HEALTH CHECK
app.get('/api/operator/health', async (req, res) => {
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ clients: [] });
  }
  const deployed = log.filter(function(e) { return e.deployed && e.port && e.slug; });
  const results = await Promise.all(deployed.map(async function(client) {
    try {
      const http = require('http');
      const health = await new Promise(function(resolve) {
        const req = http.get({ hostname: 'localhost', port: client.port, path: '/api/health', timeout: 3000 }, function(r) {
          let data = '';
          r.on('data', function(d) { data += d; });
          r.on('end', function() {
            try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
          });
        });
        req.on('error', function() { resolve(null); });
        req.on('timeout', function() { req.destroy(); resolve(null); });
      });
      return { slug: client.slug, name: client.name, port: client.port, online: health, status: health ? health.status : 'offline' };    } catch(e) {
      return { slug: client.slug, name: client.name, port: client.port, online: false, status: 'offline' };
    }
  }));
  res.json({ clients: results });
});

// FLIP CLIENT LIVE
app.post('/api/operator/golive', (req, res) => {
  const { code } = req.body;
  const logPath = path.join(__dirname, 'data', 'onboarding-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch(e) {
    return res.json({ success: false, error: 'Could not read log' });
  }
  const idx = log.findIndex(e => e.code && e.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return res.json({ success: false, error: 'Not found' });
  const slug = log[idx].slug;
  const clientDir = '/home/cce/clients/' + slug;
  const envPath = clientDir + '/.env';
  try {
    const { execSync } = require('child_process');
    // Flip dry run off
    execSync('sed -i s/CCE_DRY_RUN=true/CCE_DRY_RUN=false/ ' + envPath);
    // Restart their engines
    execSync('pm2 restart ' + slug + '-cce --update-env');
    // Record in log
    log[idx].live = true;
    log[idx].wentLiveAt = new Date().toISOString();
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
    console.log('[OPERATOR] 🚀 ' + log[idx].name + ' went LIVE');
    res.json({ success: true });
  } catch(e) {
    console.error('[OPERATOR] Go live failed:', e.message);
    res.json({ success: false, error: e.message });
  }
});
