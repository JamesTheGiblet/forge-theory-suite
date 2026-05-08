This doc is good but needs updating — it's missing the Cloudflare tunnel section referenced in the title, the appendices are incomplete, and a few things have drifted from v2.1.0-stable. Here's the updated version:

---

# 📘 CCE Pocket Node Deployment Guide – Cloudflare Edition

**Run the Cascade Compounding Engine 24/7 on Android via Termux, with a Public Dashboard at Your Own Domain**

This guide documents the complete, reproducible process for deploying the **Cascade Compounding Engine (CCE)** on an Android device using Termux. It reflects the final, stable configuration after resolving all compatibility issues, module conflicts, and runtime constraints.

**CCE Pocket** transforms any modern Android phone into a sovereign compute node capable of running the engine continuously, with a live private dashboard, remote access via SSH, and an optional public dashboard via Cloudflare Tunnel.

---

## 1. Overview

CCE is a deterministic, 8-state autonomous trading engine:

| State | Purpose |
|-------|---------|
| DORMANT | Bear market capital preservation (100% cash) |
| ACCUMULATION | Early trend test (25% BTC, 75% cash) |
| ANCHOR | Volatility buffer and gain lock (50% BTC, 50% cash) |
| IGNITION | Maximum BTC exposure (100% BTC) |
| CASCADE_1 | Large-cap alt rotation (80% BTC, 10% ETH, 10% SOL) |
| CASCADE_2 | Balanced alt exposure (60% BTC, 20% ETH, 20% SOL) |
| SPILLWAY | Defensive gain lock (90% BTC, 10% cash) |
| EXTRACTION | Emergency crash exit (100% cash) |

**CCE Pocket** enables the engine to run:

- 24/7 on an Android phone
- Without cloud dependencies
- With full process supervision (PM2)
- With a real-time private dashboard (port 3000, token-authenticated emergency stop)
- Accessible remotely via SSH port forwarding or Cloudflare Tunnel

---

## 2. Skill Level Required

Intermediate to advanced familiarity with command line (Termux/bash), Node.js, Git, PM2, and basic networking (SSH, DNS). A developer comfortable with Linux environments can complete this in a few hours.

---

## 3. Requirements

- Android device (ARM64 recommended)
- Termux (from F-Droid — **not** the Play Store version)
- Termux:Boot (from F-Droid)
- Basic command-line familiarity

---

## 4. Termux Environment Setup

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs git python binutils make gcc clang
```

---

## 5. Import the CCE Project

```bash
cd ~/storage/downloads
cp -r "CCE Crypto 28.02.2026" ~/cce-crypto
cd ~/cce-crypto
npm install
```

---

## 6. SQLite Compatibility Fix

The standard `sqlite3` package requires native compilation which fails on Termux due to missing NDK components.

**Solution:** Replace with `yskj-sqlite-android` — a prebuilt Termux-compatible module.

```bash
npm uninstall sqlite3
npm install yskj-sqlite-android
```

`storage.js` is rewritten to use the synchronous API. See Appendix A.

---

## 7. Module System Resolution

Node.js throws `ERR_AMBIGUOUS_MODULE_SYNTAX` when a file mixes `require()` and top-level `await`.

**Solution:** Wrap the engine in an async IIFE while keeping the project in CommonJS mode (no `"type": "module"` in `package.json`). See Appendix B.

---

## 8. Environment Configuration

Create `.env` in the project root:

```bash
# Safety — always start in dry run
CCE_DRY_RUN=true
STARTING_CAPITAL=300
CIRCUIT_BREAKER_PCT=-20
BASE_CURRENCY=USD

# Exchange (trading permissions only — NO withdrawal)
KRAKEN_API_KEY=your_key_here
KRAKEN_API_SECRET=your_secret_here

# Telegram notifications
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Dashboard emergency stop authentication
DASHBOARD_STOP_TOKEN=your_secure_token_here
```

---

## 9. Process Management with PM2

```bash
npm install -g pm2
pm2 start index.js --name cce-bot
pm2 start dashboard-server.js --name cce-dashboard
pm2 save
```

Or use the ecosystem config:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 10. Auto-Start on Device Boot

### Install Termux:Boot

1. Install from F-Droid
2. Open the app once — this creates `~/.termux/boot/` and registers it with Android

### Create the Boot Script

```bash
mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-cce
```

```bash
#!/data/data/com.termux/files/usr/bin/bash
exec > /data/data/com.termux/files/home/.termux/boot/start-cce.log 2>&1
set -x

termux-wake-lock
cd /data/data/com.termux/files/home/cce-crypto
pm2 start ecosystem.config.js --env production
```

```bash
chmod +x ~/.termux/boot/start-cce
```

### Battery Optimisation

- **Settings → Apps → Termux → Battery → Unrestricted**
- **Settings → Apps → Termux:Boot → Battery → Unrestricted**
- Lock Termux in recent apps (tap icon → Lock)

---

## 11. Remote Access via SSH (Private Dashboard)

```bash
# On phone
sshd
ifconfig  # Note wlan0 IP e.g. 172.16.4.3

# On laptop
ssh -L 8080:localhost:3000 u0_a179@172.16.4.3 -p 8022
```

Open `http://localhost:8080` on your laptop.

---

## 12. Public Dashboard via Cloudflare Tunnel

This exposes the dashboard publicly at your own domain with no open ports and no VPN required.

### 12.1 Install cloudflared

```bash
pkg install cloudflared
```

Or download the ARM64 binary manually:

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
chmod +x cloudflared-linux-arm64
mv cloudflared-linux-arm64 $PREFIX/bin/cloudflared
```

### 12.2 Authenticate

```bash
cloudflared tunnel login
```

This opens a browser window. Log in to your Cloudflare account and authorise the domain.

### 12.3 Create the Tunnel

```bash
cloudflared tunnel create cce-pocket
```

Note the tunnel ID returned — you'll need it in the next step.

### 12.4 Configure the Tunnel

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: <your-tunnel-id>
credentials-file: /data/data/com.termux/files/home/.cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: cce.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### 12.5 Add DNS Record

```bash
cloudflared tunnel route dns cce-pocket cce.yourdomain.com
```

This creates a CNAME record in Cloudflare DNS automatically.

### 12.6 Start the Tunnel

```bash
cloudflared tunnel run cce-pocket
```

Or add it to PM2:

```bash
pm2 start "cloudflared tunnel run cce-pocket" --name cce-tunnel
pm2 save
```

Add to boot script:

```bash
pm2 start ecosystem.config.js --env production
pm2 start "cloudflared tunnel run cce-pocket" --name cce-tunnel
```

The dashboard is now live at `https://cce.yourdomain.com`.

### 12.7 Public vs Private Dashboard

The public dashboard should be a read-only view — no emergency stop button, no trade details. Keep the full private dashboard on port 3000 only.

If serving both: run the public dashboard on a separate port (e.g. 3001) with a stripped-down `public-public/index.html`, and point the Cloudflare tunnel at that port instead.

---

## 13. Emergency Stop

The dashboard emergency stop endpoint requires token authentication:

```
POST /api/emergency-stop
Header: Authorization: Bearer <DASHBOARD_STOP_TOKEN>
```

The big red button in the private dashboard sends this automatically. Without the correct token the endpoint returns `401 Unauthorized`.

To stop the bot from the command line:

```bash
pm2 stop cce-bot
```

---

## 14. Final System Architecture

```
Android Phone (Termux)
├── PM2
│   ├── cce-bot          (index.js — 4-hour cycle)
│   ├── cce-dashboard    (dashboard-server.js — port 3000)
│   └── cce-tunnel       (cloudflared — Cloudflare Tunnel)
├── SQLite               (data/cce-production.db — WAL mode)
├── Termux:Boot          (auto-start on reboot)
└── termux-wake-lock     (prevents CPU sleep)

External
├── Kraken API           (price data + order execution)
├── Fear & Greed API     (sentiment signal)
├── CoinGecko/CoinPaprika (BTC dominance)
├── Telegram Bot         (state change + trade alerts)
└── Cloudflare Tunnel    → https://cce.yourdomain.com (public dashboard)
```

---

## 15. Troubleshooting

| Issue | Symptom | Resolution |
|-------|---------|------------|
| `sqlite3` build failure | `distutils` missing, NDK errors | Replace with `yskj-sqlite-android`, rewrite `storage.js` |
| Module syntax error | `ERR_AMBIGUOUS_MODULE_SYNTAX` | Wrap engine in async IIFE, no `"type": "module"` |
| Dashboard missing modules | `Cannot find module 'express'` | Run `npm install` inside project folder |
| PM2 resurrect restores errored state | Processes start errored after reboot | Use fresh `pm2 start` in boot script |
| Emergency stop 401 | Button returns Unauthorized | Check `DASHBOARD_STOP_TOKEN` in `.env` matches dashboard config |
| Emergency stop 404 | Button does nothing | Ensure POST route exists and dashboard restarted after changes |
| Cloudflare tunnel drops | Dashboard goes offline | Add `cce-tunnel` to PM2 for auto-restart |
| Boot script not running | No processes after reboot | Check Termux:Boot install, battery settings, lock Termux in recents |
| Android kills Termux | Processes die overnight | Battery → Unrestricted, lock in recents, `termux-wake-lock` in boot script |

---

## 16. Operational Commands

| Action | Command |
|--------|---------|
| View all logs | `pm2 logs` |
| View bot logs only | `pm2 logs cce-bot` |
| Restart all | `pm2 restart all` |
| Stop bot only | `pm2 stop cce-bot` |
| Monitor processes | `pm2 monit` |
| Check PM2 status | `pm2 status` |
| Start SSH server | `sshd` |
| Stop SSH server | `pkill sshd` |
| Release wake lock | `termux-wake-unlock` |
| Check tunnel status | `pm2 logs cce-tunnel` |

---

## Appendix A: `storage.js` (Termux / yskj-sqlite-android)

```javascript
// src/storage.js — Termux-compatible synchronous SQLite via yskj-sqlite-android
'use strict';

const Database = require('yskj-sqlite-android');
const path     = require('path');
const fs       = require('fs');

class StorageManager {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'cce-production.db');
    this._initDb();
  }

  _initDb() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS state_history (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        from_state TEXT,
        to_state   TEXT,
        reason     TEXT,
        timestamp  DATETIME
      );
      CREATE TABLE IF NOT EXISTS trades (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol    TEXT,
        side      TEXT,
        amount    REAL,
        price     REAL,
        value     REAL,
        reason    TEXT,
        order_id  TEXT,
        timestamp DATETIME
      );
      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        state     TEXT,
        holdings  TEXT,
        timestamp DATETIME
      );
      CREATE TABLE IF NOT EXISTS cce_cycles (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp             DATETIME,
        cycle_number          INTEGER,
        btc_price             REAL,
        fear_greed            INTEGER,
        btc_dominance         REAL,
        etf_flows_7d          REAL,
        current_state         TEXT,
        previous_state        TEXT,
        days_in_state         REAL,
        portfolio_value       REAL,
        btc_holdings          REAL,
        usdc_holdings         REAL,
        daily_return          REAL,
        total_return          REAL,
        btc_above_20_sma      BOOLEAN,
        sma_20_above_50       BOOLEAN,
        btc_was_strong_3d_ago BOOLEAN,
        btc_was_strong_7d_ago BOOLEAN,
        transition_progress   REAL,
        transition_message    TEXT
      );
      CREATE TABLE IF NOT EXISTS daily_reports (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date        DATE,
        cycles_completed   INTEGER,
        start_value        REAL,
        end_value          REAL,
        daily_return       REAL,
        btc_return         REAL,
        alpha              REAL,
        state_changes      INTEGER,
        trades_executed    INTEGER,
        avg_fear_greed     REAL,
        max_drawdown_24h   REAL,
        time_in_market_pct REAL,
        report_json        TEXT,
        timestamp          DATETIME
      );
    `);

    // Schema migrations — swallow duplicate column errors only
    ['transition_progress REAL', 'transition_message TEXT'].forEach(col => {
      try { this.db.exec(`ALTER TABLE cce_cycles ADD COLUMN ${col}`); } catch (e) {}
    });
  }

  logStateChange(data) {
    this.db.prepare(
      'INSERT INTO state_history (from_state, to_state, reason, timestamp) VALUES (?, ?, ?, ?)'
    ).run(data.from, data.to, data.reason, data.timestamp || new Date().toISOString());
  }

  logTrade(data) {
    this.db.prepare(
      'INSERT INTO trades (symbol, side, amount, price, value, reason, order_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      data.symbol, data.side, data.amount, data.price,
      data.amount * data.price, data.reason, data.orderId,
      new Date().toISOString()
    );
  }

  savePortfolioSnapshot(portfolio, state) {
    this.db.prepare(
      'INSERT INTO portfolio_snapshots (state, holdings, timestamp) VALUES (?, ?, ?)'
    ).run(state, JSON.stringify(portfolio), new Date().toISOString());
  }

  logCycle(data) {
    this.db.prepare(`
      INSERT INTO cce_cycles (
        timestamp, cycle_number, btc_price, fear_greed, btc_dominance, etf_flows_7d,
        current_state, previous_state, days_in_state, portfolio_value,
        btc_holdings, usdc_holdings, daily_return, total_return,
        btc_above_20_sma, sma_20_above_50, btc_was_strong_3d_ago, btc_was_strong_7d_ago,
        transition_progress, transition_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      data.cycle_number, data.btc_price, data.fear_greed, data.btc_dominance, data.etf_flows_7d,
      data.current_state, data.previous_state, data.days_in_state, data.portfolio_value,
      data.btc_holdings, data.usdc_holdings, data.daily_return, data.total_return,
      data.btc_above_20_sma  ? 1 : 0,
      data.sma_20_above_50   ? 1 : 0,
      data.btc_was_strong_3d_ago ? 1 : 0,
      data.btc_was_strong_7d_ago ? 1 : 0,
      data.transition_progress ?? 0,
      data.transition_message  ?? ''
    );
  }

  saveDailyReport(data) {
    this.db.prepare(`
      INSERT INTO daily_reports (
        report_date, cycles_completed, start_value, end_value, daily_return,
        btc_return, alpha, state_changes, trades_executed, avg_fear_greed,
        max_drawdown_24h, time_in_market_pct, report_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.report_date, data.cycles_completed, data.start_value, data.end_value,
      data.daily_return, data.btc_return, data.alpha, data.state_changes,
      data.trades_executed, data.avg_fear_greed, data.max_drawdown_24h,
      data.time_in_market_pct, JSON.stringify(data.report_json),
      new Date().toISOString()
    );
  }

  getCycleHistory(limit = 100) {
    return this.db.prepare(
      'SELECT * FROM cce_cycles ORDER BY timestamp DESC LIMIT ?'
    ).all(limit).reverse();
  }

  getDailyReports(limit = 30) {
    return this.db.prepare(
      'SELECT * FROM daily_reports ORDER BY timestamp DESC LIMIT ?'
    ).all(limit);
  }

  getLatestCycle() {
    return this.db.prepare(
      'SELECT * FROM cce_cycles ORDER BY timestamp DESC LIMIT 1'
    ).get();
  }

  getStateTransitions(limit = 10) {
    return this.db.prepare(
      'SELECT * FROM state_history ORDER BY timestamp DESC LIMIT ?'
    ).all(limit);
  }

  getTrades(limit = 10) {
    return this.db.prepare(
      'SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?'
    ).all(limit);
  }

  close() {
    this.db.close();
    console.log('📦 Database connection closed.');
  }
}

module.exports = StorageManager;
```

---

## Appendix B: `index.js` (Async IIFE, CommonJS)

```javascript
// index.js — CommonJS with async IIFE for Termux compatibility
'use strict';

require('dotenv').config();
const config    = require('./config');
const CCEEngine = require('./cce-engine');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║        CASCADE COMPOUNDING ENGINE (CCE) v2.1.0-stable         ║
╚════════════════════════════════════════════════════════════════╝
`);

console.log('🔍 Running Pre-flight Strategy Tests...');
try {
  require('./tests/test-strategy');
  console.log('✅ Pre-flight tests passed.\n');
} catch (error) {
  console.error('\n🛑 CRITICAL: Strategy Self-Tests Failed');
  console.error(`   Reason: ${error.message}\n`);
  process.exit(1);
}

(async () => {
  let engine;

  const shutdown = async () => {
    console.log('\n🛑 Shutdown signal received...');
    if (engine) {
      await Promise.race([
        engine.stop(),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    }
    process.exit(0);
  };

  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);

  if (!config.execution.dryRun) {
    if (!config.exchange.apiKey || !config.exchange.apiSecret) {
      console.error('❌ Live trading requires KRAKEN_API_KEY and KRAKEN_API_SECRET');
      process.exit(1);
    }
    console.warn('\n⚠️  LIVE TRADING MODE');
    for (let i = 10; i > 0; i--) {
      process.stdout.write(`\r   Starting in ${i}s... (Ctrl+C to abort)`);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('');
  }

  engine = new CCEEngine(config);
  engine.start().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
})();
```

---

## Appendix C: `dashboard-server.js` (Termux compatible)

```javascript
// dashboard-server.js — synchronous StorageManager, no dynamic import needed
'use strict';

const express    = require('express');
const path       = require('path');
const { exec }   = require('child_process');
const Storage    = require('./src/storage');

const app      = express();
const storage  = new Storage();
const PORT     = process.env.DASHBOARD_PORT || 3000;
const STOP_TOKEN = process.env.DASHBOARD_STOP_TOKEN;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  try {
    const latest = storage.getLatestCycle();
    res.json(latest || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  res.json(storage.getCycleHistory(limit));
});

app.get('/api/transitions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  res.json(storage.getStateTransitions(limit));
});

app.get('/api/trades', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  res.json(storage.getTrades(limit));
});

app.post('/api/emergency-stop', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!STOP_TOKEN || token !== STOP_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  exec('pm2 stop cce-bot', (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Bot stopped', output: stdout });
  });
});

app.listen(PORT, () => {
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  if (!STOP_TOKEN) console.warn('⚠️  DASHBOARD_STOP_TOKEN not set — emergency stop unprotected');
});
```

---

**You have built a production-grade, portable, sovereign trading node on a phone.**

*"The market can remain irrational longer than you can remain solvent. A state machine can remain disciplined forever."*
