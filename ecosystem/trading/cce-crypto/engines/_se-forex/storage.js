'use strict';
const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

class SeForexStorage {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'se-forex.db');
    this.db = null;
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
      CREATE TABLE IF NOT EXISTS cycles (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, cycle INTEGER, state TEXT, portfolio_value REAL, daily_pnl REAL, signals TEXT);
      CREATE TABLE IF NOT EXISTS transitions (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, from_state TEXT, to_state TEXT, signals TEXT);
      CREATE TABLE IF NOT EXISTS errors (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, error TEXT);
    `);
  }
  _save() { try { if(this.db) fs.writeFileSync(this.dbPath, Buffer.from(this.db.export())); } catch(e){} }
  logCycle(d)      { if(!this.db)return; this.db.run('INSERT INTO cycles (timestamp,cycle,state,portfolio_value,daily_pnl,signals) VALUES (?,?,?,?,?,?)',[d.timestamp,d.cycle,d.state,d.portfolioValue,d.dailyPnl,d.signals]); this._save(); }
  logTransition(d) { if(!this.db)return; this.db.run('INSERT INTO transitions (timestamp,from_state,to_state,signals) VALUES (?,?,?,?)',[d.timestamp,d.from,d.to,d.signals]); this._save(); }
  logError(d)      { if(!this.db)return; this.db.run('INSERT INTO errors (timestamp,error) VALUES (?,?)',[d.timestamp,d.error]); this._save(); }
  getHistory(n=100){ if(!this.db)return[]; const r=this.db.exec(`SELECT * FROM cycles ORDER BY timestamp DESC LIMIT ${n}`); if(!r[0])return[]; return r[0].values.map(row=>Object.fromEntries(r[0].columns.map((c,i)=>[c,row[i]]))); }
  getLatest()      { if(!this.db)return null; const r=this.db.exec('SELECT * FROM cycles ORDER BY timestamp DESC LIMIT 1'); if(!r[0]?.values[0])return null; return Object.fromEntries(r[0].columns.map((c,i)=>[c,r[0].values[0][i]])); }
  close()          { try { this._save(); this.db?.close(); } catch(e){} }
}
module.exports = SeForexStorage;
