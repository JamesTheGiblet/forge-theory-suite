# CCE Production Quick Start

**Get the Cascade Compounding Engine running in production safely.**

> 🔴 **CRITICAL:** Always start in dry run mode. Test for 30+ days. Start with £50, not £300. Monitor constantly.

---

## Installation (5 minutes)

```bash
# 1. Extract and enter directory
cd cce-production

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit configuration
nano .env
# Add your Kraken API keys, set CCE_DRY_RUN=true
```

---

## Windows "Easy Mode" Build

If you want to distribute this to non-technical users, you can build a single `.exe` file that requires no installation.

1. **Update `package.json`**:
   Add this to your `package.json` file to ensure the dashboard assets are bundled:

   ```json
   "pkg": {
     "assets": ["public/**/*"]
   }
   ```

2. **Run the Build Script**:

   ```bash
   node scripts/build-win.js
   ```

3. **Distribute**:
   Go to the `dist/` folder. Zip the contents (not the folder itself).
   The user just needs to unzip and double-click `start.bat`.

---

## Configuration (.env)

```bash
# Exchange credentials (required for live, not for dry run)
KRAKEN_API_KEY=your_actual_api_key
KRAKEN_API_SECRET=your_actual_secret

# Safety (KEEP THIS TRUE until ready)
CCE_DRY_RUN=true

# Trading
STARTING_CAPITAL=300
BASE_CURRENCY=USD
CIRCUIT_BREAKER_PCT=-20

# AI Optimization (Optional - Claude)
ANTHROPIC_API_KEY=your-claude-key-here
```

**API Key Permissions:** Trading only — never withdrawal.

---

## Run Locally

```bash
# Dry run (safe simulation)
npm run dry-run

# Dry run + dashboard
npm run dry-run-all
# Dashboard: http://localhost:3000

# Live trading (after 30+ days dry run validation)
npm start
# 5-second abort window, press Ctrl+C to cancel
```

---

## Raspberry Pi Deployment

### Setup Script

```bash
#!/bin/bash
# Run on your Raspberry Pi

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git sqlite3

# Transfer CCE files (run from your computer)
scp -r cce-production/ pi@raspberrypi.local:~/

# SSH into Pi
ssh pi@raspberrypi.local

# Navigate and install
cd ~/cce-production
npm install

# Configure
nano .env
# Add API keys, set CCE_DRY_RUN=true

# Create data/logs directories
mkdir -p data logs

# Test
npm run dry-run
```

### systemd Service (Auto-start on Boot)

Create `/etc/systemd/system/cce.service`:

```ini
[Unit]
Description=Cascade Compounding Engine
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=10
User=pi
WorkingDirectory=/home/pi/cce-production
ExecStart=/usr/bin/node index.js
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable cce
sudo systemctl start cce
sudo systemctl status cce

# Monitor logs
sudo journalctl -u cce -f
```

---

## Monitoring

### Check Status

```bash
# Live logs (systemd)
sudo journalctl -u cce -f

# Local run logs
tail -f logs/reports.log

# Current state
sqlite3 data/cce-production.db \
  "SELECT current_state, portfolio_value, total_return, fear_greed 
   FROM cce_cycles ORDER BY timestamp DESC LIMIT 1;"

# State history
sqlite3 data/cce-production.db \
  "SELECT timestamp, from_state, to_state, reason 
   FROM state_history ORDER BY timestamp DESC LIMIT 10;"

# Recent trades
sqlite3 data/cce-production.db \
  "SELECT timestamp, symbol, side, amount, price, value 
   FROM trades ORDER BY timestamp DESC LIMIT 10;"

# Performance summary
sqlite3 data/cce-production.db \
  "SELECT report_date, end_value, daily_return, btc_return, alpha 
   FROM daily_reports ORDER BY report_date DESC LIMIT 7;"
```

### System Health (Pi)

```bash
# Process status
systemctl status cce

# Memory usage
htop

# Disk space
df -h

# Network connectivity
ping -c 4 api.kraken.com
```

---

## Safety Checklists

### Before First Dry Run

- [ ] API keys configured (trading only, no withdrawal)
- [ ] `CCE_DRY_RUN=true` in .env
- [ ] Starting capital set correctly (300 or less)
- [ ] `data/` and `logs/` directories exist
- [ ] Node.js v18+ installed (`node --version`)
- [ ] Dependencies installed (`npm install`)

### Before Going Live

- [ ] 30+ days successful dry run completed
- [ ] All 8 state transitions tested and logged
- [ ] Pre-flight tests passing (`node test-strategy.js`)
- [ ] Database verified (`node verify-db.js`)
- [ ] Telegram notifications configured (optional but recommended)
- [ ] Emergency stop procedure documented
- [ ] Started with small capital (£50–100, not £300)
- [ ] Monitoring plan established (check at least daily)

### Weekly Maintenance

- [ ] Review trade log for anomalies
- [ ] Verify portfolio value vs database
- [ ] Check state transitions are logical
- [ ] Monitor Kraken API rate limits (none hit)
- [ ] Backup database: `cp data/cce-production.db backups/cce-$(date +%Y%m%d).db`
- [ ] Review performance vs BTC hold

---

## Troubleshooting

### Engine Won't Start

```bash
# Check Node.js version (must be 18+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json && npm install

# Verify .env file exists and has required keys
cat .env | grep KRAKEN
cat .env | grep CCE_DRY_RUN

# Run pre-flight tests manually
node test-strategy.js
```

### Trades Failing

```bash
# Test Kraken connection
node -e "const ccxt = require('ccxt'); const k = new ccxt.kraken(); \
k.fetchTicker('BTC/USD').then(console.log).catch(console.error);"

# Check API key permissions:
# - Trading: YES
# - Withdrawal: NO

# Verify minimum order size
# Kraken requires minimum $10 per trade
```

### State Machine Not Transitioning

```bash
# Check current signals
sqlite3 data/cce-production.db \
  "SELECT btc_price, fear_greed, btc_above_20_sma, sma_20_above_50, current_state 
   FROM cce_cycles ORDER BY timestamp DESC LIMIT 1;"

# DORMANT stuck for weeks is NORMAL in bear markets
# Requires: 60 days in DORMANT (bear) or F&G >= 60 (sentiment override) + BTC > SMA20
```

### Database Locked

```bash
# Close any SQLite browsers or duplicate processes
ps aux | grep node

# Kill duplicates if found
kill <PID>

# If persistent, restart service
sudo systemctl restart cce
```

### LunarCrush 402 Error

```
⚠️ LunarCrush fetch failed: Request failed with status code 402
```

This is expected — the `/coins/` endpoint requires Builder plan ($240/mo). Remove `LUNARCRUSH_API_KEY` from `.env` to silence. The engine works correctly without it.

---

## State Allocations Reference

| State | BTC | ETH | SOL | RNDR | FET | Cash |
|-------|-----|-----|-----|------|-----|------|
| DORMANT | 0% | 0% | 0% | 0% | 0% | 100% |
| ACCUMULATION | 25% | 0% | 0% | 0% | 0% | 75% |
| ANCHOR | 50% | 0% | 0% | 0% | 0% | 50% |
| IGNITION | 100% | 0% | 0% | 0% | 0% | 0% |
| CASCADE_1 | 60% | 20% | 20% | 0% | 0% | 0% |
| CASCADE_2 | 60% | 20% | 8% | 6% | 6% | 0% |
| SPILLWAY | 80% | 10% | 5% | 2.5% | 2.5% | 0% |
| EXTRACTION | 0% | 0% | 0% | 0% | 0% | 100% |

---

## File Structure

```
cce-production/
├── index.js                 # Entry point with pre-flight tests
├── cce-engine.js            # Core 4-hour cycle orchestrator
├── config.js                # Configuration (reads .env)
├── strategy.js              # State machine + signals + rebalancer
├── data-feed.js             # Market data (Kraken, F&G, dominance)
├── exchange-connector.js    # CCXT Kraken + dry run mock
├── storage.js               # SQLite operations
├── notification.js          # Telegram alerts
├── dashboard-server.js      # Web dashboard (port 3000)
├── test-strategy.js         # Automated tests (runs on startup)
├── verify-db.js             # Database inspection utility
├── package.json
├── .env                     # YOUR CONFIG (never commit this)
├── .env.example             # Template
├── data/
│   └── cce-production.db    # SQLite database
└── logs/
    └── reports.log          # Periodic reports
```

---

## Emergency Stop Procedure

If something goes wrong:

```bash
# 1. Stop the engine immediately
sudo systemctl stop cce      # (Pi with systemd)
# OR
Ctrl+C                       # (local terminal)

# 2. Check current portfolio state
sqlite3 data/cce-production.db \
  "SELECT * FROM portfolio_snapshots ORDER BY timestamp DESC LIMIT 1;"

# 3. Review recent trades
sqlite3 data/cce-production.db \
  "SELECT * FROM trades ORDER BY timestamp DESC LIMIT 20;"

# 4. Log in to Kraken manually
# Close positions if needed using Kraken web interface

# 5. Document what happened
tail -100 logs/reports.log > incident-$(date +%Y%m%d).log
sudo journalctl -u cce -n 200 >> incident-$(date +%Y%m%d).log

# 6. Do NOT restart until root cause is understood
```

---

## Support

**Documentation:**

- Full README: `README.md` (comprehensive system guide)
- Technical docs: `TECH_README.md` (implementation details)
- This guide: `QUICKSTART.md` (operations reference)

**Diagnostics:**

```bash
node test-strategy.js    # Verify strategy logic
node verify-db.js        # Check database integrity
npm run dry-run          # Test in safe mode
```

**Logs:**

- systemd: `sudo journalctl -u cce -f`
- Local: `tail -f logs/reports.log`
- Database: `sqlite3 data/cce-production.db`

---

**Remember: You are trading real money. Test thoroughly. Monitor constantly. Start small.**

---

**Version:** 2.0.1
**Last Updated:** February 2026
