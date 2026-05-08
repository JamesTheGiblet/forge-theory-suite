# CCE Quick Start
### Get the platform running in under 10 minutes

**Giblets Creations · v2.4.0 · March 2026**

---

> 🔴 **Always start in dry run mode. Every engine defaults to `dryRun: true`. Never change this without 30+ days of paper trading validation.**

---

## Requirements

- Android device with Termux (Samsung S24 Ultra recommended)
- OR any Linux system with Node.js v18+
- Kraken account (for S.E Crypto live trading)
- PM2 (`npm install -g pm2`)

---

## Installation

```bash
# 1. Clone or extract the platform
cd ~/
git clone <repo> cce-crypto
cd cce-crypto

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
nano .env
Environment Configuration (.env)
# Exchange — trading only, never withdrawal permission
KRAKEN_API_KEY=your_api_key
KRAKEN_API_SECRET=your_api_secret

# Telegram alerts (recommended)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Data feeds
WEATHER_API_KEY=your_openweathermap_key
FRED_API_KEY=your_fred_key
ALPHA_VANTAGE_KEY=your_alpha_vantage_key

# Licence
LICENCE_KEY=DEV

# AI Optimizer (optional)
ANTHROPIC_API_KEY=sk-ant-...
Start the Platform
# Start all engines
pm2 start index.js --name cce-bot

# Start the dashboard
pm2 start dashboard-server.js --name dashboard

# Start CCE Unreal (optional — commercial platform layer)
cd ~/cce-unreal
pm2 start index-unreal.js --name cce-unreal --instances 2 -i max

# Save PM2 config (survives reboots)
pm2 save

# Auto-start on device boot
pm2 startup
Schedule Intelligence Layers
# Forensic Layer — weekly (Monday 9am)
pm2 start src/cce-fl-engine.js --name cce-fl \
  --cron "0 9 * * 1" --no-autorestart

# AUDIT — daily health check (8am)
pm2 start src/cce-audit-engine.js --name cce-audit \
  --cron "0 8 * * *" --no-autorestart

# Capital Siphon — daily profit skim (midnight)
pm2 start src/cce-css-engine.js --name cce-css \
  --cron "0 0 * * *" --no-autorestart

pm2 save
Verify Everything Is Running
pm2 ls
# Should show: cce-bot (online), dashboard (online)

# Check live data
curl -s http://localhost:3000/api/status

# Check dashboard
# Open browser → http://localhost:3000

# Check CCE Unreal
# Open browser → http://localhost:3001
Before Going Live
Work through this checklist before setting any engine to dryRun: false:
[ ] 30+ days dry run completed
[ ] Telegram alerts firing correctly
[ ] Dashboard showing real data
[ ] Portfolio value matches Kraken balance
[ ] All pre-flight tests passing (node tests/test-strategy.js)
[ ] Circuit breakers configured (config.js → trading.circuitBreakerPct)
[ ] Start with small capital (£50, not £300)
[ ] Emergency stop procedure known
Going Live (S.E Crypto Only)
Edit config.js:
execution: {
  dryRun: false,  // ⚠️ LIVE TRADING
  ...
}
Restart:
pm2 restart cce-bot
# 10-second abort window — press Ctrl+C to cancel
All other engines stay on dryRun: true until individually validated.
Dashboard
http://localhost:3000          Main dashboard
http://localhost:3000/history  Portfolio history
http://localhost:3001          CCE Unreal Platform
http://localhost:3001/forge/builder    Visual Engine Builder
http://localhost:3001/forge/replay     Backtest Replay
http://localhost:3001/marketplace      Engine Marketplace
http://localhost:3001/docs             Documentation
CLI Tools
# Engine registry
cce list                        # List registered engines
cce validate <engine-id>        # Validate engine contract
cce new-engine <id> --type strategic --cycle 4H

# Deployment (requires VPS setup)
cce-deploy setup
cce-deploy push <engine-id>
cce-deploy status
Monitor
# Live logs
cat ~/.pm2/logs/cce-bot-out.log | tail -20
cat ~/.pm2/logs/cce-bot-error.log | tail -20
cat ~/.pm2/logs/dashboard-out.log | tail -10

# Database query (sql.js — no sqlite3 CLI)
node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('data/cce-production.db'));
  const r = db.exec('SELECT btc_price, current_state, portfolio_value FROM cce_cycles ORDER BY id DESC LIMIT 1');
  console.log(r[0]?.values);
  db.close();
});
"
Emergency Stop
# Stop all engines immediately
pm2 stop cce-bot

# Check last known state
curl -s http://localhost:3000/api/status

# Log in to Kraken directly to close positions manually
# https://www.kraken.com

# Do NOT restart until root cause is understood
pm2 logs cce-bot --lines 100
File Structure
cce-crypto/
├── index.js              Entry point — all 13 engines
├── dashboard-server.js   Dashboard API + static server
├── config.js             All configuration
├── src/                  Engine source files (50 files)
├── engines/              Framework registry engines
├── data/                 Live databases (never delete)
├── public/               Dashboard HTML + assets
├── docs/                 Platform documentation
├── bin/                  CLI tools (cce, cce-deploy)
├── pipeline/             5-step validation pipeline
├── ai-layers/            AI layer registry
├── scripts/              Utility scripts
└── tests/                Pre-flight test suite
Common Issues
Engine not cycling
Check pm2 logs cce-bot-error — usually a missing API key or data feed timeout.
Dashboard showing --
Check pm2 logs dashboard-error — usually a database path issue or missing dotenv.
sql.js errors
Never use sqlite3 CLI or native bindings on Android. Always use sql.js via Node.js.
Telegram not sending
Verify TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env, then pm2 restart dashboard.
Giblets Creations · v2.4.0 · March 2026
"I wanted it. So I forged it. Now forge yours."
