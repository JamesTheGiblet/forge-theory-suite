// engines/_template/storage.js
// CCE Core Framework — Storage Template
// Uses sql.js (pure JS SQLite) for Android/Termux compatibility.
// Do NOT use native sqlite3 — it will not compile on Android.

'use strict';

const path = require('path');
const fs   = require('fs');

class TemplateStorage {

  constructor(dbPath) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'template.db');
    this._initDb();
  }

  _initDb() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // sql.js initialisation — pure JavaScript SQLite
    const Database = require('sql.js');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cycles (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp      DATETIME,
        cycle          INTEGER,
        state          TEXT,
        portfolio_value REAL,
        daily_pnl      REAL,
        signals        TEXT
      );

      CREATE TABLE IF NOT EXISTS transitions (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME,
        from_state TEXT,
        to_state   TEXT,
        signals    TEXT
      );

      CREATE TABLE IF NOT EXISTS trades (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME,
        symbol    TEXT,
        side      TEXT,
        amount    REAL,
        price     REAL,
        value     REAL,
        pnl       REAL,
        dry_run   INTEGER
      );

      CREATE TABLE IF NOT EXISTS errors (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME,
        error     TEXT
      );
    `);
  }

  // ── REQUIRED METHODS ─────────────────────────────────────────────────────────

  logCycle(data) {
    this.db.prepare(`
      INSERT INTO cycles (timestamp, cycle, state, portfolio_value, daily_pnl, signals)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.timestamp,
      data.cycle,
      data.state,
      data.portfolioValue,
      data.dailyPnl,
      data.signals
    );
  }

  logTransition(data) {
    this.db.prepare(`
      INSERT INTO transitions (timestamp, from_state, to_state, signals)
      VALUES (?, ?, ?, ?)
    `).run(data.timestamp, data.from, data.to, data.signals);
  }

  logTrade(data) {
    this.db.prepare(`
      INSERT INTO trades (timestamp, symbol, side, amount, price, value, pnl, dry_run)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.timestamp,
      data.symbol,
      data.side,
      data.amount,
      data.price,
      data.value,
      data.pnl || 0,
      data.dryRun ? 1 : 0
    );
  }

  logError(data) {
    this.db.prepare(
      'INSERT INTO errors (timestamp, error) VALUES (?, ?)'
    ).run(data.timestamp, data.error);
  }

  // ── QUERY METHODS ─────────────────────────────────────────────────────────────

  getHistory(limit = 100) {
    return this.db.prepare(
      'SELECT * FROM cycles ORDER BY timestamp DESC LIMIT ?'
    ).all(limit).reverse();
  }

  getLatest() {
    return this.db.prepare(
      'SELECT * FROM cycles ORDER BY timestamp DESC LIMIT 1'
    ).get();
  }

  getTransitions(limit = 20) {
    return this.db.prepare(
      'SELECT * FROM transitions ORDER BY timestamp DESC LIMIT ?'
    ).all(limit);
  }

  getTrades(limit = 20) {
    return this.db.prepare(
      'SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?'
    ).all(limit);
  }

  // ── CLOSE ─────────────────────────────────────────────────────────────────────

  close() {
    try {
      this.db.close();
    } catch (e) {
      // silent close
    }
  }

}

module.exports = TemplateStorage;
