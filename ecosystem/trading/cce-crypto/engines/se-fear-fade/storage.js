// engines/se-fear-fade/storage.js
'use strict';

const path      = require('path');
const fs        = require('fs');
const initSqlJs = require('sql.js');

class SeFearFadeStorage {

  constructor(dbPath) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'se-fear-fade.db');
    this.db     = null;
    this._ready = this._init();
  }

  async _init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const SQL = await initSqlJs();
    this.db = fs.existsSync(this.dbPath)
      ? new SQL.Database(fs.readFileSync(this.dbPath))
      : new SQL.Database();
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ff_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT, cycle INTEGER, state TEXT,
        portfolio_value REAL, daily_pnl REAL, signals TEXT
      );
      CREATE TABLE IF NOT EXISTS ff_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT, entry_price REAL, exit_price REAL,
        entry_fg INTEGER, exit_fg INTEGER,
        pnl_pct REAL, pnl_usd REAL, dry_run INTEGER
      );
      CREATE TABLE IF NOT EXISTS ff_transitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT, from_state TEXT, to_state TEXT, signals TEXT
      );
      CREATE TABLE IF NOT EXISTS ff_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT, error TEXT
      );
    `);
    this._persist();
  }

  _persist() {
    if (!this.db) return;
    try { fs.writeFileSync(this.dbPath, Buffer.from(this.db.export())); } catch(e) {}
  }

  logCycle(data) {
    if (!this.db) return;
    try {
      this.db.run(
        'INSERT INTO ff_cycles (timestamp,cycle,state,portfolio_value,daily_pnl,signals) VALUES (?,?,?,?,?,?)',
        [data.timestamp||'', data.cycle||0, data.state||'DORMANT', data.portfolioValue||0, data.dailyPnl||0, data.signals||'{}']
      );
      this._persist();
    } catch(e) {}
  }

  logTrade(data) {
    if (!this.db) return;
    try {
      this.db.run(
        'INSERT INTO ff_trades (timestamp,entry_price,exit_price,entry_fg,exit_fg,pnl_pct,pnl_usd,dry_run) VALUES (?,?,?,?,?,?,?,?)',
        [data.timestamp||'', data.entry_price||0, data.exit_price||0, data.entry_fg||0, data.exit_fg||0, data.pnl_pct||0, data.pnl_usd||0, data.dry_run||1]
      );
      this._persist();
    } catch(e) {}
  }

  logTransition(data) {
    if (!this.db) return;
    try {
      this.db.run(
        'INSERT INTO ff_transitions (timestamp,from_state,to_state,signals) VALUES (?,?,?,?)',
        [data.timestamp||'', data.from||'', data.to||'', data.signals||'{}']
      );
      this._persist();
    } catch(e) {}
  }

  logError(data) {
    if (!this.db) return;
    try {
      this.db.run('INSERT INTO ff_errors (timestamp,error) VALUES (?,?)', [data.timestamp||'', data.error||'']);
      this._persist();
    } catch(e) {}
  }

  close() { this._persist(); }
}

module.exports = SeFearFadeStorage;
