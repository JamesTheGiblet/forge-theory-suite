// dashboard-server.js
// CCE Platform Core — Multi-Engine Dashboard Server
'use strict';

const express = require('express');
const path    = require('path');
const { exec } = require('child_process');

const StorageManager    = require('./src/storage');
const RMEStorageManager = require('./src/rme-storage');
const CMEStorageManager  = require('./src/cme-storage');
const COMOStorageManager = require('./src/como-storage');
const GridStorageManager = require('./src/grid-storage');
const OBSStorageManager  = require('./src/obs-storage');
const MOMStorageManager  = require('./src/mom-storage');
const BRKStorageManager  = require('./src/brk-storage');

const app  = express();
const port = process.env.DASHBOARD_PORT || 3000;
const STOP_TOKEN = process.env.DASHBOARD_STOP_TOKEN || null;

// Initialise all storage managers
const cryptoStorage = new StorageManager();
const rmeStorage    = new RMEStorageManager();
const cmeStorage    = new CMEStorageManager();
const comoStorage   = new COMOStorageManager();
const gridStorage   = new GridStorageManager();
const obsStorage    = new OBSStorageManager();
const momStorage    = new MOMStorageManager();
const brkStorage    = new BRKStorageManager();
const EGPStorageManager  = require('./src/egp-storage');
const egpStorage    = new EGPStorageManager();

// Init async storage
Promise.all([
  rmeStorage.init(),
  cmeStorage.init(),
  comoStorage.init(),
  gridStorage.init(),
  obsStorage.init(),
  momStorage.init(),
  brkStorage.init(),
  egpStorage.init()
]).then(() => {
  console.log('📊 Dashboard storage ready (all engines)');
}).catch(e => {
  console.warn('⚠️  Dashboard secondary storage init error:', e.message);
});

app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public/docs/index.html')));
app.get('/docs/', (req, res) => res.sendFile(path.join(__dirname, 'public/docs/index.html')));
app.get('/docs/files/*', (req, res) => {
  const safe = req.params[0].replace(/\.\./g, '');
  res.sendFile(path.join(__dirname, 'docs', safe), err => {
    if (err) res.status(404).json({ error: 'Not found: ' + safe });
  });
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ============================================================================
// CRYPTO ENDPOINTS (existing)
// ============================================================================

app.get('/api/status', async (req, res) => {
  try {
    const status = await cryptoStorage.getLatestCycle();
    const obsCount = await obsStorage.getObservationCount();
    const obsLatest = await obsStorage.getLatestObservation();
    const obsPatterns = await obsStorage.getLatestPatterns(5);
    const result = status || {};
    result.obs_count = obsCount;
    result.obs_latest = obsLatest;
    result.obs_patterns_count = obsPatterns.length;
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const history = await cryptoStorage.getCycleHistory(limit);
    res.json(history);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/transitions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const transitions = await cryptoStorage.getStateTransitions(limit);
    res.json(transitions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/trades', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const trades = await cryptoStorage.getTrades(limit);
    res.json(trades);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await cryptoStorage.getDailyReports(30);
    res.json(reports);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// RME ENDPOINTS
// ============================================================================

app.get('/api/rme/status', async (req, res) => {
  try {
    const latest = await rmeStorage.getLatestCycle();
    res.json(latest || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/rme/trades', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const trades = await rmeStorage.getTradeHistory(limit);
    res.json(trades);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// CME ENDPOINTS
// ============================================================================

app.get('/api/cme/status', async (req, res) => {
  try {
    const latest = await cmeStorage.getLatestCycle();
    res.json(latest || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/cme/trades', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const trades = await cmeStorage.getTradeHistory(limit);
    res.json(trades);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ============================================================================
// COMO ENDPOINTS
// ============================================================================

app.get('/api/como/status', async (req, res) => {
  try {
    const latest = await comoStorage.getLatestCycle();
    res.json(latest || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/como/trades', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const trades = await comoStorage.getTradeHistory(limit);
    res.json(trades);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// COMBINED EXPORT
// ============================================================================


// ============================================================================
// MULTI-ENGINE HISTORY
// ============================================================================
app.get('/api/history/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const cceRows = cryptoStorage.db.exec(
      `SELECT timestamp, btc_price, fear_greed, portfolio_value, current_state, btc_dominance FROM cce_cycles ORDER BY timestamp DESC LIMIT ${limit}`
    );
    const cmeRows = cmeStorage.db.exec(
      `SELECT timestamp, price as spy_price, vix, rsi, state, portfolio_value FROM cme_cycles ORDER BY timestamp DESC LIMIT ${limit}`
    );
    const comoRows = comoStorage.db.exec(
      `SELECT timestamp, oil_price, gold_price, copper_price, dxy_price, state FROM como_cycles ORDER BY timestamp DESC LIMIT ${limit}`
    );
    const rmeRows = rmeStorage.db.exec(
      `SELECT timestamp, fed_rate, treasury_yield, yield_spread, state, price as reit_price FROM rme_cycles ORDER BY timestamp DESC LIMIT ${limit}`
    );

    const toObj = (rows) => {
      const { columns, values } = rows[0];
      return values.map(row => {
        const o = {};
        columns.forEach((c, i) => o[c] = row[i]);
        return o;
      }).reverse();
    };

    res.json({
      cce:  toObj(cceRows),
      cme:  toObj(cmeRows),
      como: toObj(comoRows),
      rme:  toObj(rmeRows),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/export', async (req, res) => {
  try {
    const [cryptoHistory, cryptoReports, rmeTrades, cmeTrades, comoTrades, gridTrades] = await Promise.all([
      cryptoStorage.getCycleHistory(5000),
      cryptoStorage.getDailyReports(365),
      rmeStorage.getTradeHistory(100),
      cmeStorage.getTradeHistory(100),
      comoStorage.getTradeHistory(100),
      gridStorage.getCompletedCycles(100)
    ]);
    res.json({
      generated_at: new Date(),
      system: 'CCE Platform Core v2.1.0',
      crypto: { history: cryptoHistory, reports: cryptoReports },
      rme:    { trades: rmeTrades },
      cme:    { trades: cmeTrades },
      como:   { trades: comoTrades },
      grid:   { cycles: gridTrades }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ============================================================================
// FORGE HQ PWA
// ============================================================================

// CCE Platform routes
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public/docs/index.html')));
app.get('/docs/', (req, res) => res.sendFile(path.join(__dirname, 'public/docs/index.html')));
app.get('/marketplace/', (req, res) => res.sendFile(path.join(__dirname, 'public/marketplace/index.html')));
app.get('/docs/files/*', (req, res) => {
  const safe = req.params[0].replace(/../g, '');
  res.sendFile(path.join(__dirname, 'docs', safe), err => {
    if (err) res.status(404).json({ error: 'Not found: ' + safe });
  });
});
app.get('/forge/builder', (req, res) => res.sendFile(path.join(__dirname, 'public/forge/builder.html')));
app.get('/forge/replay',  (req, res) => res.sendFile(path.join(__dirname, 'public/forge/replay.html')));
app.get('/marketplace',   (req, res) => res.sendFile(path.join(__dirname, 'public/marketplace/index.html')));
app.get('/marketplace/',  (req, res) => res.sendFile(path.join(__dirname, 'public/marketplace/index.html')));

app.get('/forge', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forge-hq.html'));
});





// ============================================================================
// REPORT GENERATOR ENDPOINT
// ============================================================================

app.get('/api/report/generate', async (req, res) => {
  try {
    const { execSync } = require('child_process');
    const path = require('path');

    console.log('[REPORT] Generating report...');

    // Run report generator
    execSync('node ' + path.join(__dirname, 'scripts', 'generate-report.js'), {
      cwd: __dirname,
      timeout: 60000
    });

    // Find latest report files
    const reportsDir = path.join(__dirname, 'reports');
    const files = require('fs').readdirSync(reportsDir);
    const stamp = files
      .filter(f => f.startsWith('cce-report-') && f.endsWith('.txt'))
      .sort()
      .pop()
      ?.replace('cce-report-', '')
      .replace('.txt', '');

    if (!stamp) return res.status(500).json({ error: 'Report generation failed' });

    res.json({
      success: true,
      stamp,
      files: {
        txt:  '/api/report/download/' + stamp + '/txt',
        html: '/api/report/download/' + stamp + '/html',
        csv:  '/api/report/download/' + stamp + '/csv'
      }
    });

  } catch (err) {
    console.error('[REPORT] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/report/download/:stamp/:type', (req, res) => {
  try {
    const path = require('path');
    const fs   = require('fs');
    const { stamp, type } = req.params;
    const reportsDir = path.join(__dirname, 'reports');

    if (type === 'txt') {
      const file = path.join(reportsDir, 'cce-report-' + stamp + '.txt');
      res.setHeader('Content-Disposition', `attachment; filename="cce-report-${stamp}.txt"`);
      res.setHeader('Content-Type', 'text/plain');
      res.send(fs.readFileSync(file));
    } else if (type === 'html') {
      const file = path.join(reportsDir, 'cce-report-' + stamp + '.html');
      res.setHeader('Content-Disposition', `attachment; filename="cce-report-${stamp}.html"`);
      res.setHeader('Content-Type', 'text/html');
      res.send(fs.readFileSync(file));
    } else if (type === 'csv') {
      const csvDir = path.join(reportsDir, 'csv-' + stamp);
      const csvFiles = fs.readdirSync(csvDir);
      // Return list of CSV files
      res.json({ files: csvFiles.map(f => '/api/report/download/' + stamp + '/csvfile/' + f) });
    } else {
      res.status(404).json({ error: 'Unknown type' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/report/download/:stamp/csvfile/:filename', (req, res) => {
  try {
    const path = require('path');
    const fs   = require('fs');
    const { stamp, filename } = req.params;
    const file = path.join(__dirname, 'reports', 'csv-' + stamp, filename);
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(fs.readFileSync(file));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================================
// DXY LAYER ENDPOINT
// ============================================================================

app.get('/api/dxy/status', (req, res) => {
  try {
    const fs   = require('fs');
    const path = require('path');
    const file = path.join(__dirname, 'data', 'dxy_state.json');
    if (!fs.existsSync(file)) {
      return res.json({ regime: 'NEUTRAL', level: 99.0, modifier: 0, fg_threshold: 60, notes: 'Not yet initialised' });
    }
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(state);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ============================================================================
// S.E EGP ENDPOINTS
// ============================================================================


// ============================================================================
// FOREX STATUS — derived from observer snapshot
// ============================================================================
app.get('/api/forex/status', async (req, res) => {
  try {
    const latest = await obsStorage.getLatestObservation();
    res.json({
      state:         latest?.forex_state || 'DORMANT',
      state_reason:  'Oversold Fade Strategy',
      portfolio_value: 300,
      eur_usd:       latest?.eur_usd || 0,
      z_score:       latest?.forex_zscore || 0,
      session:       latest?.forex_session || '--',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


app.get('/api/egp/status', async (req, res) => {
  try {
    const r = egpStorage.db.exec(`SELECT * FROM egp_cycles ORDER BY timestamp DESC LIMIT 1`);
    if (!r.length) return res.json({ state: 'DORMANT', composite_score: 0, divergence_flag: 0 });
    const { columns, values } = r[0];
    const obj = {};
    columns.forEach((c, i) => obj[c] = values[0][i]);
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/egp/transitions', async (req, res) => {
  try {
    const r = egpStorage.db.exec(`SELECT * FROM egp_transitions ORDER BY timestamp DESC LIMIT 10`);
    if (!r.length) return res.json([]);
    const { columns, values } = r[0];
    res.json(values.map(row => { const o = {}; columns.forEach((c,i) => o[c]=row[i]); return o; }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// T.E MOMENTUM ENDPOINTS
// ============================================================================

app.get('/api/mom/status', async (req, res) => {
  try {
    const stats  = await momStorage.getStats();
    const latest = await momStorage.getLatestCycle('BTC/USDC');
    const obsSnap = await obsStorage.getLatestObservation();
    res.json({ stats, latest, state: obsSnap?.mom_state || latest?.state || 'STANDBY', state_reason: 'Enable after dry run validation', capital: 125, pnl: 0, trades: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/mom/trades', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 200);
    const trades = await momStorage.getTrades(limit);
    res.json(trades);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ============================================================================
// T.E BREAKOUT ENDPOINTS
// ============================================================================

app.get('/api/brk/status', async (req, res) => {
  try {
    const stats     = await brkStorage.getStats();
    const squeezes  = await brkStorage.getActiveSqueezees();
    res.json({ stats, active_squeezes: squeezes.length, state: 'SCANNING', capital: 100, pnl: stats?.total_pnl || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/brk/trades', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 200);
    const trades = await brkStorage.getTrades(limit);
    res.json(trades);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// O.E OBSERVER ENDPOINTS
// ============================================================================

app.get('/api/obs/status', async (req, res) => {
  try {
    const latest   = await obsStorage.getLatestObservation();
    const count    = await obsStorage.getObservationCount();
    const patterns = await obsStorage.getLatestPatterns(5);
    res.json({ latest, count, patterns });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/obs/observations', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 96, 1000);
    const obs = await obsStorage.getObservations(limit);
    res.json(obs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/obs/transitions', async (req, res) => {
  try {
    const transitions = await obsStorage.getTransitions(20);
    res.json(transitions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/obs/patterns', async (req, res) => {
  try {
    const patterns = await obsStorage.getLatestPatterns(20);
    res.json(patterns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/obs/summaries', async (req, res) => {
  try {
    const summaries = await obsStorage.getDailySummaries(30);
    res.json(summaries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// GRID ENDPOINTS
// ============================================================================

app.get('/api/grid/status', async (req, res) => {
  try {
    const latest = await gridStorage.getLatestCycle();
    res.json(latest || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/grid/cycles', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const result = gridStorage.db ? gridStorage.db.exec(
      'SELECT * FROM grid_cycles ORDER BY timestamp DESC LIMIT ' + limit
    ) : [];
    if (!result.length) return res.json([]);
    const { columns, values } = result[0];
    res.json(values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/grid/completed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 200);
    const trades = await gridStorage.getCompletedCycles(limit);
    res.json(trades);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/grid/events', async (req, res) => {
  try {
    const events = await gridStorage.getRecentEvents(10);
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ============================================================================
// T.E LCE — LIQUIDATION CASCADE ENGINE ENDPOINTS
// ============================================================================

app.get("/api/lce/status", async (req, res) => {
  try {
    const fs   = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "lce.db.json");
    if (!fs.existsSync(file)) return res.json({ state: "DORMANT", dailyPnlPct: 0, dailyTrades: 0, cycleCount: 0, activePosition: null });
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const cycles = data.cycles || [];
    const trades = data.trades || [];
    const latest = cycles[cycles.length - 1] || {};
    const wins   = trades.filter(t => t.pnlPct > 0).length;
    const avgPnl = trades.length ? (trades.reduce((s,t) => s + (t.pnlPct||0), 0) / trades.length).toFixed(2) : 0;
    res.json({ state: latest.state || "DORMANT", action: latest.action, dailyPnlPct: latest.dailyPnl || 0, dailyTrades: latest.dailyTrades || 0, cycleCount: cycles.length, totalTrades: trades.length, winRate: trades.length ? ((wins/trades.length)*100).toFixed(1) : 0, avgPnl, activePosition: null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/lce/trades", async (req, res) => {
  try {
    const fs   = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "lce.db.json");
    if (!fs.existsSync(file)) return res.json([]);
    const data   = JSON.parse(fs.readFileSync(file, "utf8"));
    const limit  = Math.min(parseInt(req.query.limit) || 20, 200);
    res.json((data.trades || []).slice(-limit).reverse());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// EMERGENCY STOP
// ============================================================================

app.post('/api/emergency-stop', (req, res) => {
  if (STOP_TOKEN) {
    const provided = req.headers['x-stop-token'] || req.body?.token;
    if (provided !== STOP_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  exec('pm2 stop cce-bot', (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'All engines stopped', output: stdout });
  });
});

// ============================================================================
// SSE — Real-time crypto stream
// ============================================================================

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = async () => {
    try {
      const data = await cryptoStorage.getLatestCycle();
      if (data) res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {}
  };

  sendUpdate();
  const interval  = setInterval(sendUpdate, 5000);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

// ============================================================================
// START
// ============================================================================


// Sentinel API
app.get('/api/sentinel/status', async (req, res) => {
  try {
    const path    = require('path');
    const fs      = require('fs');
    const dbPath  = path.join(__dirname, 'data', 'sentinel-production.db');
    if (!fs.existsSync(dbPath)) return res.json({ active_anomalies: 0, active: [], recent: [], total_anomalies: 0, total_cycles: 0, alert_count: 0, warn_count: 0, info_count: 0 });

    const initSqlJs = require('sql.js');
    const SQL  = await initSqlJs();
    const db   = new SQL.Database(fs.readFileSync(dbPath));

    const q = (sql, params) => {
      const r = db.exec(sql, params);
      if (!r.length) return [];
      const { columns, values } = r[0];
      return values.map(row => { const o = {}; columns.forEach((c,i) => o[c] = row[i]); return o; });
    };

    const active  = q('SELECT * FROM sentinel_anomalies WHERE resolved=0 ORDER BY timestamp DESC');
    const recent  = q('SELECT * FROM sentinel_anomalies ORDER BY timestamp DESC LIMIT 20');
    const totals  = q('SELECT COUNT(*) as c FROM sentinel_anomalies')[0] || { c: 0 };
    const cycles  = q('SELECT COUNT(*) as c FROM sentinel_cycles')[0] || { c: 0 };

    db.close();

    res.json({
      active_anomalies: active.length,
      alert_count:      active.filter(a => a.severity === 'ALERT').length,
      warn_count:       active.filter(a => a.severity === 'WARN').length,
      info_count:       active.filter(a => a.severity === 'INFO').length,
      total_anomalies:  totals.c,
      total_cycles:     cycles.c,
      active,
      recent,
      last_run:         new Date().toISOString()
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

if (require.main === module) app.listen(port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   CCE Platform Core — Dashboard Server                         ║
╚════════════════════════════════════════════════════════════════╝
🌐 http://localhost:${port}
📊 Engines: Crypto | Forex | REIT | Stocks | Commodities | Grid | Momentum | Breakout | LCE | Observer | Strategist
${STOP_TOKEN ? '🔒 Emergency stop: protected' : '⚠️  Emergency stop: set DASHBOARD_STOP_TOKEN'}
`);
});


// Live ticker — always fresh from CoinGecko
app.get('/api/ticker', async (req, res) => {
  try {
    const https = require('https');
    const fetch = (url) => new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'CCE-Platform/2.1' } }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const [gecko, fg] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'),
      fetch('https://api.alternative.me/fng/?limit=1')
    ]);

    res.json({
      btc_price:    gecko.bitcoin?.usd,
      btc_change24: gecko.bitcoin?.usd_24h_change?.toFixed(2),
      fear_greed:   parseInt(fg.data?.[0]?.value || 0),
      fg_label:     fg.data?.[0]?.value_classification,
      timestamp:    new Date().toISOString()
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CCE CORE FRAMEWORK — DYNAMIC ENDPOINTS ───────────────────────────────────
// Append this block to the bottom of dashboard-server.js
// (before the app.listen() call)
//
// Exposes engine registry and layer registry data via REST API.
// Forge HQ and the Command Dashboard can poll these for dynamic engines/layers.
//
// SETUP: Pass registries into the dashboard server.
// In dashboard-server.js, export a setup function:
//
//   module.exports = { app, setupRegistries };
//
// Then in index.js after registries are built:
//
//   const { setupRegistries } = require('./dashboard-server');
//   setupRegistries(registry, layerRegistry);
//
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// Registry references — set via setupRegistries()
let _engineRegistry = null;
let _layerRegistry  = null;

function setupRegistries(engineRegistry, layerRegistry) {
  _engineRegistry = engineRegistry;
  _layerRegistry  = layerRegistry;
  console.log('📊 Dashboard: dynamic registry endpoints active');
}

// ── ENGINE REGISTRY ENDPOINTS ─────────────────────────────────────────────────

// GET /api/registry/engines
// Returns status of all dynamically registered engines
app.get('/api/registry/engines', (req, res) => {
  try {
    if (!_engineRegistry) {
      return res.json({ engines: {}, count: 0, note: 'Engine registry not initialised' });
    }
    const status = _engineRegistry.getStatus();
    res.json({
      engines: status,
      count:   Object.keys(status).length,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/registry/engines/:id
// Returns status of a single dynamic engine by id
app.get('/api/registry/engines/:id', (req, res) => {
  try {
    if (!_engineRegistry) {
      return res.status(503).json({ error: 'Engine registry not initialised' });
    }
    const engine = _engineRegistry.get(req.params.id);
    if (!engine) {
      return res.status(404).json({ error: `Engine not found: ${req.params.id}` });
    }
    res.json(engine.getStatus());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/registry/engines/:id/state
// Returns just the current state string for a dynamic engine
app.get('/api/registry/engines/:id/state', (req, res) => {
  try {
    if (!_engineRegistry) {
      return res.status(503).json({ error: 'Engine registry not initialised' });
    }
    const engine = _engineRegistry.get(req.params.id);
    if (!engine) {
      return res.status(404).json({ error: `Engine not found: ${req.params.id}` });
    }
    res.json({ id: req.params.id, state: engine.getState() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LAYER REGISTRY ENDPOINTS ──────────────────────────────────────────────────

// GET /api/registry/layers
// Returns status of all dynamically registered AI layers
app.get('/api/registry/layers', (req, res) => {
  try {
    if (!_layerRegistry) {
      return res.json({ layers: {}, count: 0, note: 'Layer registry not initialised' });
    }
    const status = _layerRegistry.getStatus();
    res.json({
      layers:    status,
      count:     Object.keys(status).length,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/registry/layers/:id
// Returns status of a single AI layer by id
app.get('/api/registry/layers/:id', (req, res) => {
  try {
    if (!_layerRegistry) {
      return res.status(503).json({ error: 'Layer registry not initialised' });
    }
    const layer = _layerRegistry.get(req.params.id);
    if (!layer) {
      return res.status(404).json({ error: `Layer not found: ${req.params.id}` });
    }
    res.json(layer.getStatus());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/registry/recommendations
// Returns aggregated recommendations from all ANALYST layers
// This is the G.O's input feed
app.get('/api/registry/recommendations', (req, res) => {
  try {
    if (!_layerRegistry) {
      return res.json({ recommendations: [], count: 0 });
    }
    const recs = _layerRegistry.getRecommendations();
    res.json({
      recommendations: recs,
      count:           recs.length,
      timestamp:       new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PLATFORM OVERVIEW ENDPOINT ────────────────────────────────────────────────

// GET /api/registry/overview
// Single endpoint returning everything — for Forge HQ dashboard refresh
app.get('/api/registry/overview', (req, res) => {
  try {
    const fs2 = require('fs');
    const engDir = path.join(__dirname, 'engines');
    const engines = {};
    if (fs2.existsSync(engDir)) {
      fs2.readdirSync(engDir).filter(f => !f.startsWith('_')).forEach(id => {
        const mf = path.join(engDir, id, 'manifest.json');
        if (fs2.existsSync(mf)) {
          try {
            const m = JSON.parse(fs2.readFileSync(mf, 'utf8'));
            engines[id] = { id: m.id, name: m.name, type: m.type, ecosystem: m.ecosystem, cycle: m.cycle, dryRun: true, state: 'RUNNING' };
          } catch(e) {}
        }
      });
    }
    res.json({ timestamp: new Date().toISOString(), engines, engineCount: Object.keys(engines).length, layers: {}, layerCount: 0, recommendations: [] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── EXPORT ────────────────────────────────────────────────────────────────────

module.exports = { setupRegistries };

// ─────────────────────────────────────────────────────────────────────────────
// FORGE HQ INTEGRATION
//
// Add this to forge-hq.html to display dynamic engines:
//
// async function loadDynamicEngines() {
//   const res = await fetch('/api/registry/overview');
//   const data = await res.json();
//
//   // Dynamic engines
//   for (const [id, status] of Object.entries(data.engines)) {
//     renderEngineCard(id, status);
//   }
//
//   // AI layer recommendations
//   for (const rec of data.recommendations) {
//     renderRecommendation(rec);
//   }
// }
//
// Call loadDynamicEngines() in your dashboard refresh interval.
// ─────────────────────────────────────────────────────────────────────────────
