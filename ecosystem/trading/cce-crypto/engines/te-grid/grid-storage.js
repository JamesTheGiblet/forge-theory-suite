// src/grid-storage.js
// CCE Grid Engine — sql.js persistence layer

'use strict';

const path = require('path');
const fs   = require('fs');

class GridStorageManager {
  constructor(dbPath) {
    const basePath = path.join(__dirname, '..');
    this.dbPath = dbPath
      ? dbPath.replace('cce-production.db', 'grid-production.db')
      : path.join(basePath, 'data', 'grid-production.db');
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
    console.log('[GRID] Storage initialised (sql.js)');
  }

  _createTables() {
    this.db.run(`CREATE TABLE IF NOT EXISTS grid_cycles (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp        DATETIME,
      run_number       INTEGER,
      btc_price        REAL,
      centre_price     REAL,
      open_buys        INTEGER,
      open_sells       INTEGER,
      filled_buys      INTEGER,
      completed_cycles INTEGER,
      total_profit     REAL,
      portfolio_value  REAL,
      grid_state       TEXT
    )`);

    this.db.run(`CREATE TABLE IF NOT EXISTS grid_orders (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp        DATETIME,
      order_id         TEXT,
      side             TEXT,
      price            REAL,
      btc_amount       REAL,
      usdc_amount      REAL,
      status           TEXT,
      level            INTEGER,
      profit           REAL
    )`);

    this.db.run(`CREATE TABLE IF NOT EXISTS grid_completed (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp        DATETIME,
      buy_price        REAL,
      sell_price       REAL,
      btc_amount       REAL,
      gross_profit     REAL,
      fees             REAL,
      net_profit       REAL,
      cycle_duration_s INTEGER
    )`);

    this.db.run(`CREATE TABLE IF NOT EXISTS grid_events (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp        DATETIME,
      event_type       TEXT,
      description      TEXT,
      btc_price        REAL,
      portfolio_value  REAL
    )`);
  }

  _persist() {
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      console.error('[GRID] Persist error:', err.message);
    }
  }

  async logCycle(data) {
    this.db.run(
      `INSERT INTO grid_cycles (
        timestamp, run_number, btc_price, centre_price,
        open_buys, open_sells, filled_buys, completed_cycles,
        total_profit, portfolio_value, grid_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.run_number, data.btc_price,
        data.centre_price, data.open_buys, data.open_sells,
        data.filled_buys, data.completed_cycles, data.total_profit,
        data.portfolio_value, data.grid_state
      ]
    );
    this._persist();
  }

  async logOrder(data) {
    this.db.run(
      `INSERT INTO grid_orders (
        timestamp, order_id, side, price, btc_amount,
        usdc_amount, status, level, profit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.order_id, data.side,
        data.price, data.btc_amount, data.usdc_amount,
        data.status, data.level, data.profit || 0
      ]
    );
    this._persist();
  }

  async logCompleted(data) {
    this.db.run(
      `INSERT INTO grid_completed (
        timestamp, buy_price, sell_price, btc_amount,
        gross_profit, fees, net_profit, cycle_duration_s
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString(), data.buy_price, data.sell_price,
        data.btc_amount, data.gross_profit, data.fees,
        data.net_profit, data.cycle_duration_s || 0
      ]
    );
    this._persist();
  }

  async logEvent(type, description, btcPrice, portfolioValue) {
    this.db.run(
      `INSERT INTO grid_events (timestamp, event_type, description, btc_price, portfolio_value)
       VALUES (?, ?, ?, ?, ?)`,
      [new Date().toISOString(), type, description, btcPrice, portfolioValue]
    );
    this._persist();
  }

  async getLatestCycle() {
    const result = this.db.exec('SELECT * FROM grid_cycles ORDER BY timestamp DESC LIMIT 1');
    if (!result.length) return null;
    const { columns, values } = result[0];
    const obj = {};
    columns.forEach((col, i) => obj[col] = values[0][i]);
    return obj;
  }

  async getCompletedCycles(limit = 20) {
    const result = this.db.exec(
      `SELECT * FROM grid_completed ORDER BY timestamp DESC LIMIT ${limit}`
    );
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  }

  async getRecentEvents(limit = 10) {
    const result = this.db.exec(
      `SELECT * FROM grid_events ORDER BY timestamp DESC LIMIT ${limit}`
    );
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  }

  async getTotalProfit() {
    const result = this.db.exec('SELECT SUM(net_profit) as total FROM grid_completed');
    return result[0]?.values[0][0] || 0;
  }

  close() {
    if (this._saveTimer) clearInterval(this._saveTimer);
    this._persist();
    this.db.close();
    console.log('[GRID] Storage closed.');
  }
}

module.exports = GridStorageManager;
