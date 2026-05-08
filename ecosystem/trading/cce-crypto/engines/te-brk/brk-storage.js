// src/brk-storage.js
// T.E Breakout — sql.js persistence layer

'use strict';

const path = require('path');
const fs   = require('fs');

class BRKStorageManager {
  constructor(dbPath) {
    const basePath = path.join(__dirname, '..');
    this.dbPath = dbPath
      ? dbPath.replace('cce-production.db', 'brk-production.db')
      : path.join(basePath, 'data', 'brk-production.db');
    this.db = null;
  }

  async init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const buf = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }

    this._createTables();
    this._saveTimer = setInterval(() => this._persist(), 30000);
    console.log('[BRK] Storage initialised (sql.js)');
  }

  _createTables() {
    this.db.run(`CREATE TABLE IF NOT EXISTS brk_cycles (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp       DATETIME,
      run_number      INTEGER,
      pair            TEXT,
      price           REAL,
      bb_width        REAL,
      in_squeeze      INTEGER,
      bars_in_squeeze INTEGER,
      rsi             REAL,
      atr             REAL,
      volume_ratio    REAL,
      signal          TEXT,
      portfolio_value REAL,
      open_positions  INTEGER
    )`);

    this.db.run(`CREATE TABLE IF NOT EXISTS brk_trades (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp        DATETIME,
      pair             TEXT,
      side             TEXT,
      entry_price      REAL,
      exit_price       REAL,
      size             REAL,
      capital_used     REAL,
      stop_loss        REAL,
      take_profit      REAL,
      measured_target  REAL,
      exit_reason      TEXT,
      pnl_pct          REAL,
      pnl_usdc         REAL,
      bars_held        INTEGER,
      squeeze_bars     INTEGER,
      range_height     REAL,
      rsi_at_entry     REAL,
      atr_at_entry     REAL,
      volume_ratio     REAL,
      order_id         TEXT,
      dry_run          INTEGER
    )`);

    this.db.run(`CREATE TABLE IF NOT EXISTS brk_squeezes (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp        DATETIME,
      pair             TEXT,
      squeeze_high     REAL,
      squeeze_low      REAL,
      range_height     REAL,
      bars_in_squeeze  INTEGER,
      broke_out        INTEGER,
      direction        TEXT
    )`);
  }

  _persist() {
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      console.error('[BRK] Persist error:', err.message);
    }
  }

  async logCycle(data) {
    this.db.run(
      `INSERT INTO brk_cycles (
        timestamp, run_number, pair, price, bb_width, in_squeeze,
        bars_in_squeeze, rsi, atr, volume_ratio, signal,
        portfolio_value, open_positions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.run_number, data.pair,
        data.price, data.bb_width, data.in_squeeze ? 1 : 0,
        data.bars_in_squeeze, data.rsi, data.atr, data.volume_ratio,
        data.signal, data.portfolio_value, data.open_positions
      ]
    );
    this._persist();
  }

  async logTrade(data) {
    this.db.run(
      `INSERT INTO brk_trades (
        timestamp, pair, side, entry_price, exit_price, size,
        capital_used, stop_loss, take_profit, measured_target,
        exit_reason, pnl_pct, pnl_usdc, bars_held, squeeze_bars,
        range_height, rsi_at_entry, atr_at_entry, volume_ratio,
        order_id, dry_run
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.pair, data.side,
        data.entry_price, data.exit_price, data.size,
        data.capital_used, data.stop_loss, data.take_profit,
        data.measured_target, data.exit_reason, data.pnl_pct,
        data.pnl_usdc, data.bars_held, data.squeeze_bars,
        data.range_height, data.rsi_at_entry, data.atr_at_entry,
        data.volume_ratio, data.order_id || null, data.dry_run ? 1 : 0
      ]
    );
    this._persist();
  }

  async logSqueeze(data) {
    this.db.run(
      `INSERT INTO brk_squeezes (
        timestamp, pair, squeeze_high, squeeze_low, range_height,
        bars_in_squeeze, broke_out, direction
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.pair, data.squeeze_high,
        data.squeeze_low, data.range_height, data.bars_in_squeeze,
        data.broke_out ? 1 : 0, data.direction || null
      ]
    );
    this._persist();
  }

  async getTrades(limit = 50) {
    const r = this.db.exec(
      `SELECT * FROM brk_trades ORDER BY timestamp DESC LIMIT ${limit}`
    );
    if (!r.length) return [];
    const { columns, values } = r[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((c, i) => obj[c] = row[i]);
      return obj;
    });
  }

  async getStats() {
    const r = this.db.exec(`
      SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl_usdc > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN pnl_usdc <= 0 THEN 1 ELSE 0 END) as losses,
        SUM(pnl_usdc) as total_pnl,
        AVG(pnl_usdc) as avg_pnl,
        MAX(pnl_usdc) as best_trade,
        MIN(pnl_usdc) as worst_trade,
        AVG(bars_held) as avg_bars_held
      FROM brk_trades
    `);
    if (!r.length || !r[0].values.length) return null;
    const { columns, values } = r[0];
    const obj = {};
    columns.forEach((c, i) => obj[c] = values[0][i]);
    return obj;
  }

  async getActiveSqueezees() {
    const r = this.db.exec(
      `SELECT * FROM brk_squeezes WHERE broke_out = 0 ORDER BY timestamp DESC LIMIT 10`
    );
    if (!r.length) return [];
    const { columns, values } = r[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((c, i) => obj[c] = row[i]);
      return obj;
    });
  }

  close() {
    if (this._saveTimer) clearInterval(this._saveTimer);
    this._persist();
    this.db.close();
    console.log('[BRK] Storage closed.');
  }
}

module.exports = BRKStorageManager;
