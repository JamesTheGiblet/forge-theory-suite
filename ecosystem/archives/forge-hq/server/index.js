'use strict';

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const path        = require('path');
const fs          = require('fs');

const app  = express();
const PORT = process.env.FORGE_PORT || 3001;
const HOME = process.env.HOME || '/data/data/com.termux/files/home';

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());

let db = null;
let save = () => {};

async function initDb() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const dbPath = path.join(HOME, 'forge-hq/data/forge.db');
  const dataDir = path.join(HOME, 'forge-hq/data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  save = () => fs.writeFileSync(dbPath, Buffer.from(db.export()));

  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, category TEXT DEFAULT 'model_kit',
    qty_ready INTEGER DEFAULT 0, qty_parts INTEGER DEFAULT 0,
    printer TEXT, sla_or_fdm TEXT DEFAULT 'fdm',
    price_gbp REAL DEFAULT 0, notes TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS printers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, type TEXT DEFAULT 'fdm',
    status TEXT DEFAULT 'offline', current_job TEXT, notes TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT, item_name TEXT, qty INTEGER DEFAULT 1,
    price_gbp REAL, status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS finance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT, amount_gbp REAL, type TEXT DEFAULT 'income',
    notes TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);

  const count = db.exec('SELECT COUNT(*) as c FROM printers')[0]?.values[0][0];
  if (!count) {
    [['Ender 3 #1','fdm'],['Ender 3 #2','fdm'],['Ender 3 #3','fdm'],
     ['Ender 3 #4','fdm'],['Ender 3 #5','fdm'],['Ender 3 #6','fdm'],
     ['Ender 3 #7','fdm'],['SLA #1','sla']
    ].forEach(([name, type]) => db.run('INSERT INTO printers (name,type,status) VALUES (?,?,?)', [name, type, 'offline']));
    save();
  }
}

function dbRows(sql, params = []) {
  try {
    const r = db.exec(sql, params);
    if (!r[0]) return [];
    return r[0].values.map(row => Object.fromEntries(r[0].columns.map((c, i) => [c, row[i]])));
  } catch(e) { return []; }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── CCE Status ────────────────────────────────────────────────────────────────
app.get('/api/cce/status', (req, res) => {
  const ccePath = path.join(HOME, 'cce-crypto/data/cce-production.db');
  if (!fs.existsSync(ccePath)) return res.json({ error: 'CCE DB not found' });

  require('sql.js')().then(SQL => {
    const cceDb = new SQL.Database(fs.readFileSync(ccePath));
    let crypto = null, forex = null;

    try {
      const r = cceDb.exec('SELECT current_state,portfolio_value,btc_price,fear_greed,total_return,daily_return FROM cce_cycles ORDER BY id DESC LIMIT 1');
      if (r[0]?.values[0]) {
        const v = r[0].values[0];
        crypto = { state: v[0], portfolio: v[1], btc_price: v[2], fear_greed: v[3], total_return: v[4], daily_return: v[5] };
      }
    } catch(e) { console.error('crypto query:', e.message); }

    try {
      const r = cceDb.exec('SELECT state,portfolio_value,price,z_score,rsi,session FROM forex_cycles ORDER BY id DESC LIMIT 1');
      if (r[0]?.values[0]) {
        const v = r[0].values[0];
        forex = { state: v[0], portfolio: v[1], price: v[2], z_score: v[3], rsi: v[4], session: v[5] };
      }
    } catch(e) { console.error('forex query:', e.message); }

    cceDb.close();
    res.json({ crypto, forex });
  }).catch(e => res.json({ error: e.message }));
});

// ── Inventory ─────────────────────────────────────────────────────────────────
app.get('/api/inventory', (req, res) => res.json(dbRows('SELECT * FROM inventory ORDER BY name')));

app.post('/api/inventory', (req, res) => {
  const { name, category, qty_ready, qty_parts, printer, sla_or_fdm, price_gbp, notes } = req.body;
  db.run('INSERT INTO inventory (name,category,qty_ready,qty_parts,printer,sla_or_fdm,price_gbp,notes) VALUES (?,?,?,?,?,?,?,?)',
    [name, category||'model_kit', qty_ready||0, qty_parts||0, printer||'', sla_or_fdm||'fdm', price_gbp||0, notes||'']);
  save();
  res.json({ ok: true });
});

app.patch('/api/inventory/:id', (req, res) => {
  const { qty_ready, qty_parts, notes } = req.body;
  db.run("UPDATE inventory SET qty_ready=?,qty_parts=?,notes=?,updated_at=datetime('now') WHERE id=?",
    [qty_ready, qty_parts, notes, req.params.id]);
  save();
  res.json({ ok: true });
});

// ── Printers ──────────────────────────────────────────────────────────────────
app.get('/api/printers', (req, res) => res.json(dbRows('SELECT * FROM printers ORDER BY type,name')));

app.patch('/api/printers/:id', (req, res) => {
  const { status, current_job, notes } = req.body;
  db.run("UPDATE printers SET status=?,current_job=?,notes=?,updated_at=datetime('now') WHERE id=?",
    [status, current_job||'', notes||'', req.params.id]);
  save();
  res.json({ ok: true });
});

// ── Finance ───────────────────────────────────────────────────────────────────
app.get('/api/finance/summary', (req, res) => {
  const rows = dbRows("SELECT source, SUM(amount_gbp) as total FROM finance WHERE type='income' AND created_at >= datetime('now','-30 days') GROUP BY source");
  const mrr  = rows.reduce((a, b) => a + (b.total || 0), 0);
  res.json({ mrr, target: 4000, breakdown: rows });
});

app.post('/api/finance', (req, res) => {
  const { source, amount_gbp, type, notes } = req.body;
  db.run('INSERT INTO finance (source,amount_gbp,type,notes) VALUES (?,?,?,?)',
    [source, amount_gbp, type||'income', notes||'']);
  save();
  res.json({ ok: true });
});

// ── Orders ────────────────────────────────────────────────────────────────────
app.get('/api/orders', (req, res) => res.json(dbRows('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50')));

app.post('/api/orders', (req, res) => {
  const { platform, item_name, qty, price_gbp, status } = req.body;
  db.run('INSERT INTO orders (platform,item_name,qty,price_gbp,status) VALUES (?,?,?,?,?)',
    [platform, item_name, qty||1, price_gbp||0, status||'pending']);
  save();
  res.json({ ok: true });
});

// ── Serve PWA ─────────────────────────────────────────────────────────────────
const distPath = path.join(HOME, 'forge-hq/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── Start ─────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🔨 The Forge HQ — port ${PORT}`);
    console.log(`   http://localhost:${PORT}\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
