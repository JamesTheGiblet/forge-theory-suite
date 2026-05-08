// src/storage.js — LCE Storage (sql.js for Android/Termux compatibility)

const fs = require('fs');
const path = require('path');
const config = require('../config');

class Storage {
  constructor() {
    this.dbPath = config.storage.dbPath;
    this.db = null;
  }

  async init() {
    try {
      const initSqlJs = require('sql.js');
      const SQL = await initSqlJs();

      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(data);
      } else {
        this.db = new SQL.Database();
      }

      this._createTables();
      this._SQL = SQL;
      console.log('[LCE] 💾 Storage initialised');
    } catch (err) {
      console.warn(`[LCE] sql.js not available: ${err.message} — using JSON fallback`);
      this._useJsonFallback();
    }
  }

  _createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER,
        state TEXT,
        action TEXT,
        signals TEXT
      );
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT,
        side TEXT,
        entry_price REAL,
        exit_price REAL,
        qty REAL,
        size_usd REAL,
        pnl_pct REAL,
        reason TEXT,
        opened_at INTEGER,
        closed_at INTEGER,
        dry_run INTEGER
      );
    `);
    this._save();
  }

  logCycle(state, action, signals) {
    if (!this.db) {
      this._jsonLog('cycles', { ts: Date.now(), state, action, signals });
      return;
    }
    try {
      this.db.run(
        `INSERT INTO cycles (ts, state, action, signals) VALUES (?, ?, ?, ?)`,
        [Date.now(), state, action, JSON.stringify(signals)]
      );
      this._save();
    } catch (err) {
      console.warn(`[LCE] logCycle error: ${err.message}`);
    }
  }

  logTrade(trade) {
    if (!this.db) {
      this._jsonLog('trades', trade);
      return;
    }
    try {
      this.db.run(
        `INSERT INTO trades (symbol, side, entry_price, exit_price, qty, size_usd, pnl_pct, reason, opened_at, closed_at, dry_run)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trade.symbol, trade.side, trade.entryPrice, trade.exitPrice,
          trade.qty, trade.sizeUsd, trade.pnlPct, trade.reason,
          trade.openedAt, trade.closedAt, trade.dryRun ? 1 : 0,
        ]
      );
      this._save();
    } catch (err) {
      console.warn(`[LCE] logTrade error: ${err.message}`);
    }
  }

  getRecentTrades(limit = 20) {
    if (!this.db) return this._jsonRead('trades').slice(-limit);
    try {
      const res = this.db.exec(`SELECT * FROM trades ORDER BY closed_at DESC LIMIT ${limit}`);
      if (!res[0]) return [];
      const { columns, values } = res[0];
      return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
    } catch { return []; }
  }

  getStats() {
    if (!this.db) {
      const trades = this._jsonRead('trades');
      return this._calcStats(trades);
    }
    try {
      const res = this.db.exec(`SELECT pnl_pct, reason FROM trades WHERE dry_run = 0`);
      if (!res[0]) return { totalTrades: 0, winRate: 0, avgPnl: 0 };
      const trades = res[0].values.map(([pnl_pct, reason]) => ({ pnlPct: pnl_pct, reason }));
      return this._calcStats(trades);
    } catch { return { totalTrades: 0, winRate: 0, avgPnl: 0 }; }
  }

  _calcStats(trades) {
    if (!trades.length) return { totalTrades: 0, winRate: 0, avgPnl: 0 };
    const wins = trades.filter(t => (t.pnlPct || t.pnl_pct) > 0).length;
    const avgPnl = trades.reduce((s, t) => s + (t.pnlPct || t.pnl_pct || 0), 0) / trades.length;
    return {
      totalTrades: trades.length,
      winRate: ((wins / trades.length) * 100).toFixed(1),
      avgPnl: avgPnl.toFixed(2),
    };
  }

  _save() {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  _useJsonFallback() {
    this.db = null;
    this._jsonPath = this.dbPath.replace('.db', '.json');
    if (!fs.existsSync(this._jsonPath)) {
      fs.writeFileSync(this._jsonPath, JSON.stringify({ cycles: [], trades: [] }));
    }
  }

  _jsonLog(table, entry) {
    try {
      const store = JSON.parse(fs.readFileSync(this._jsonPath));
      store[table].push(entry);
      if (store[table].length > 1000) store[table] = store[table].slice(-500);
      fs.writeFileSync(this._jsonPath, JSON.stringify(store));
    } catch {}
  }

  _jsonRead(table) {
    try {
      return JSON.parse(fs.readFileSync(this._jsonPath))[table] || [];
    } catch { return []; }
  }
}

module.exports = Storage;
