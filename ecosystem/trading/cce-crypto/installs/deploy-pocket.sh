#!/data/data/com.termux/files/usr/bin/bash

# 📘 CCE Pocket Node Deployment Script
# Automates the setup described in CCE_Pocket_Node_Deployment_Guide.md
# Run this inside Termux on Android

set -e # Exit on error

echo "🚀 Starting CCE Pocket Node Setup..."

# Ensure we are in the project root (if script is run from installs/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
if [[ "$(basename "$SCRIPT_DIR")" == "installs" ]]; then
    cd "$SCRIPT_DIR/.."
    echo "📂 Changed working directory to project root: $(pwd)"
fi

# Capture current directory for boot script configuration
INSTALL_DIR=$(pwd)

# 1. Termux Environment Setup
echo "📦 Installing System Packages..."
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts python binutils make gcc clang git sqlite

# 2. Project Dependencies & SQLite Fix
echo "🔧 Configuring Dependencies..."
# Remove node_modules if it exists (often corrupted if copied from PC)
if [ -d "node_modules" ]; then
    echo "   Cleaning old node_modules..."
    rm -rf node_modules
fi

npm install

echo "   - Swapping sqlite3 for yskj-sqlite-android (Termux compatible)..."
npm uninstall sqlite3
npm install yskj-sqlite-android
npm install -g pm2

# 3. Apply Storage Layer Rewrite (Synchronous API for Android)
echo "📝 Rewriting src/storage.js for Android compatibility..."
mkdir -p src
cat > src/storage.js << 'EOF'
const Database = require('yskj-sqlite-android');
const path = require('path');
const fs = require('fs');

class StorageManager {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'cce-production.db');
    this._initDb();
  }

  _initDb() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(this.dbPath);

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS state_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_state TEXT,
        to_state TEXT,
        reason TEXT,
        timestamp DATETIME
      );
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT,
        side TEXT,
        amount REAL,
        price REAL,
        value REAL,
        reason TEXT,
        order_id TEXT,
        timestamp DATETIME
      );
      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state TEXT,
        holdings TEXT,
        timestamp DATETIME
      );
      CREATE TABLE IF NOT EXISTS cce_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME,
        cycle_number INTEGER,
        btc_price REAL,
        fear_greed INTEGER,
        btc_dominance REAL,
        etf_flows_7d REAL,
        current_state TEXT,
        previous_state TEXT,
        days_in_state REAL,
        portfolio_value REAL,
        btc_holdings REAL,
        usdc_holdings REAL,
        daily_return REAL,
        total_return REAL,
        btc_above_20_sma BOOLEAN,
        sma_20_above_50 BOOLEAN,
        btc_was_strong_3d_ago BOOLEAN,
        btc_was_strong_7d_ago BOOLEAN,
        max_drawdown REAL,
        sharpe_ratio REAL,
        transition_progress REAL,
        transition_message TEXT
      );
      CREATE TABLE IF NOT EXISTS daily_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date DATE,
        cycles_completed INTEGER,
        start_value REAL,
        end_value REAL,
        daily_return REAL,
        btc_return REAL,
        alpha REAL,
        state_changes INTEGER,
        trades_executed INTEGER,
        avg_fear_greed REAL,
        max_drawdown_24h REAL,
        time_in_market_pct REAL,
        report_json TEXT,
        timestamp DATETIME
      );
    `);
    
    // Migrations
    try { this.db.exec("ALTER TABLE cce_cycles ADD COLUMN transition_progress REAL"); } catch (e) {}
    try { this.db.exec("ALTER TABLE cce_cycles ADD COLUMN transition_message TEXT"); } catch (e) {}
  }

  async logStateChange(data) {
    const stmt = this.db.prepare('INSERT INTO state_history (from_state, to_state, reason, timestamp) VALUES (?, ?, ?, ?)');
    stmt.run(data.from, data.to, data.reason, (data.timestamp || new Date()).toISOString());
  }

  async logTrade(data) {
    const stmt = this.db.prepare('INSERT INTO trades (symbol, side, amount, price, value, reason, order_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(data.symbol, data.side, data.amount, data.price, data.value, data.reason, data.orderId, new Date().toISOString());
  }

  async savePortfolioSnapshot(portfolio, state) {
    const stmt = this.db.prepare('INSERT INTO portfolio_snapshots (state, holdings, timestamp) VALUES (?, ?, ?)');
    stmt.run(state, JSON.stringify(portfolio), new Date().toISOString());
  }

  async logCycle(data) {
    const stmt = this.db.prepare(`INSERT INTO cce_cycles (
      timestamp, cycle_number, btc_price, fear_greed, btc_dominance, etf_flows_7d,
      current_state, previous_state, days_in_state, portfolio_value,
      btc_holdings, usdc_holdings, daily_return, total_return,
      btc_above_20_sma, sma_20_above_50, btc_was_strong_3d_ago, btc_was_strong_7d_ago,
      max_drawdown, sharpe_ratio, transition_progress, transition_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      new Date().toISOString(), data.cycle_number, data.btc_price, data.fear_greed, data.btc_dominance, data.etf_flows_7d,
      data.current_state, data.previous_state, data.days_in_state, data.portfolio_value,
      data.btc_holdings, data.usdc_holdings, data.daily_return, data.total_return,
      data.btc_above_20_sma, data.sma_20_above_50, data.btc_was_strong_3d_ago, data.btc_was_strong_7d_ago,
      data.max_drawdown, data.sharpe_ratio, data.transition_progress || 0, data.transition_message || ''
    );
  }

  async saveDailyReport(data) {
    const stmt = this.db.prepare(`INSERT INTO daily_reports (
      report_date, cycles_completed, start_value, end_value, daily_return,
      btc_return, alpha, state_changes, trades_executed, avg_fear_greed,
      max_drawdown_24h, time_in_market_pct, report_json, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run(
      data.report_date, data.cycles_completed, data.start_value, data.end_value, data.daily_return,
      data.btc_return, data.alpha, data.state_changes, data.trades_executed, data.avg_fear_greed,
      data.max_drawdown_24h, data.time_in_market_pct, JSON.stringify(data.report_json), new Date().toISOString()
    );
  }

  async getCycleHistory(limit = 100) {
    const stmt = this.db.prepare('SELECT * FROM cce_cycles ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(limit);
    return rows.reverse();
  }

  async getDailyReports(limit = 30) {
    const stmt = this.db.prepare('SELECT * FROM daily_reports ORDER BY timestamp DESC LIMIT ?');
    return stmt.all(limit);
  }

  async getLatestCycle() {
    const stmt = this.db.prepare('SELECT * FROM cce_cycles ORDER BY timestamp DESC LIMIT 1');
    return stmt.get();
  }

  async getStateTransitions(limit = 10) {
    const stmt = this.db.prepare('SELECT * FROM state_history ORDER BY timestamp DESC LIMIT ?');
    return stmt.all(limit);
  }

  async getTrades(limit = 10) {
    const stmt = this.db.prepare('SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?');
    return stmt.all(limit);
  }
}

module.exports = StorageManager;
EOF

# 4. Setup Termux Boot
echo "📲 Setting up Termux:Boot..."
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-cce << EOF
#!/data/data/com.termux/files/usr/bin/bash
exec > /data/data/com.termux/files/home/.termux/boot/start-cce.log 2>&1
set -x
termux-wake-lock
cd $INSTALL_DIR
pm2 resurrect
EOF
chmod +x ~/.termux/boot/start-cce

# 5. Environment
if [ ! -f .env ]; then
    echo "⚠️  Creating .env file..."
    cp .env.example .env 2>/dev/null || echo "CCE_DRY_RUN=true" > .env
fi

# Acquire wake lock immediately
echo "🔋 Acquiring Wake Lock (Prevent sleep)..."
termux-wake-lock

echo "✅ Setup Complete!"
echo "   1. Edit .env with your API keys."
echo "   2. Start processes:"
echo "      pm2 start index.js --name cce-bot"
echo "      pm2 start dashboard-server.js --name cce-dashboard"
echo "      pm2 save"