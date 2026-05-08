// src/mom-storage.js
// T.E Momentum — sql.js persistence layer

'use strict';

const path = require('path');
const fs   = require('fs');

class MOMStorageManager {
  constructor(dbPath) {
    const basePath = path.join(__dirname, '..');
    this.dbPath = dbPath
      ? dbPath.replace('cce-production.db', 'mom-production.db')
      : path.join(basePath, 'data', 'mom-production.db');
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
    console.log('[MOM] Storage initialised (sql.js)');
  }

  _createTables() {
    this.db.run(`CREATE TABLE IF NOT EXISTS mom_cycles (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp         DATETIME,
      run_number        INTEGER,
      pair              TEXT,
      price             REAL,
      ema_fast          REAL,
      ema_slow          REAL,
      ema_trend         REAL,
      rsi               REAL,
      atr               REAL,
      volume_ratio      REAL,
      signal            TEXT,
      portfolio_value   REAL,
      open_positions    INTEGER
    )`);

    this.db.run(`CREATE TABLE IF NOT EXISTS mom_trades (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp         DATETIME,
      pair              TEXT,
      side              TEXT,
      entry_price       REAL,
      exit_price        REAL,
      size              REAL,
      capital_used      REAL,
      stop_loss         REAL,
      take_profit       REAL,
      trail_level       REAL,
      exit_reason       TEXT,
      pnl_pct           REAL,
      pnl_usdc          REAL,
      candles_held      INTEGER,
      rsi_at_entry      REAL,
      atr_at_entry      REAL,
      volume_ratio      REAL,
      order_id          TEXT,
      dry_run           INTEGER
    )`);

    this.db.run(`CREATE TABLE IF NOT EXISTS mom_signals (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp         DATETIME,
      pair              TEXT,
      signal_type       TEXT,
      price             REAL,
      rsi               REAL,
      atr               REAL,
      volume_ratio      REAL,
      stop_loss         REAL,
      take_profit       REAL,
      risk_reward       REAL,
      acted_on          INTEGER
    )`);
  }

  _persist() {
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      console.error('[MOM] Persist error:', err.message);
    }
  }

  async logCycle(data) {
    this.db.run(
      `INSERT INTO mom_cycles (
        timestamp, run_number, pair, price, ema_fast, ema_slow,
        ema_trend, rsi, atr, volume_ratio, signal, portfolio_value, open_positions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.run_number, data.pair,
        data.price, data.ema_fast, data.ema_slow, data.ema_trend,
        data.rsi, data.atr, data.volume_ratio, data.signal,
        data.portfolio_value, data.open_positions
      ]
    );
    this._persist();
  }

  async logTrade(data) {
    this.db.run(
      `INSERT INTO mom_trades (
        timestamp, pair, side, entry_price, exit_price, size,
        capital_used, stop_loss, take_profit, trail_level,
        exit_reason, pnl_pct, pnl_usdc, candles_held,
        rsi_at_entry, atr_at_entry, volume_ratio, order_id, dry_run
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.pair, data.side,
        data.entry_price, data.exit_price, data.size,
        data.capital_used, data.stop_loss, data.take_profit,
        data.trail_level, data.exit_reason, data.pnl_pct,
        data.pnl_usdc, data.candles_held, data.rsi_at_entry,
        data.atr_at_entry, data.volume_ratio,
        data.order_id || null, data.dry_run ? 1 : 0
      ]
    );
    this._persist();
  }

  async logSignal(data) {
    this.db.run(
      `INSERT INTO mom_signals (
        timestamp, pair, signal_type, price, rsi, atr,
        volume_ratio, stop_loss, take_profit, risk_reward, acted_on
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.pair, data.signal_type,
        data.price, data.rsi, data.atr, data.volume_ratio,
        data.stop_loss, data.take_profit, data.risk_reward,
        data.acted_on ? 1 : 0
      ]
    );
    this._persist();
  }

  async getTrades(limit = 50) {
    const r = this.db.exec(
      `SELECT * FROM mom_trades ORDER BY timestamp DESC LIMIT ${limit}`
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
        AVG(candles_held) as avg_hold_candles
      FROM mom_trades
    `);
    if (!r.length || !r[0].values.length) return null;
    const { columns, values } = r[0];
    const obj = {};
    columns.forEach((c, i) => obj[c] = values[0][i]);
    return obj;
  }

  async getLatestCycle(pair) {
    const r = this.db.exec(
      `SELECT * FROM mom_cycles WHERE pair = '${pair}' ORDER BY timestamp DESC LIMIT 1`
    );
    if (!r.length) return null;
    const { columns, values } = r[0];
    const obj = {};
    columns.forEach((c, i) => obj[c] = values[0][i]);
    return obj;
  }

  close() {
    if (this._saveTimer) clearInterval(this._saveTimer);
    this._persist();
    this.db.close();
    console.log('[MOM] Storage closed.');
  }
}

module.exports = MOMStorageManager;
