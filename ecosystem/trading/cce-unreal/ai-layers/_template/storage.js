// ai-layers/_template/storage.js
// CCE Core Framework — AI Layer Storage Template
// Uses sql.js (pure JS SQLite) for Android/Termux compatibility.

'use strict';

const path = require('path');
const fs   = require('fs');

class LayerStorage {

  constructor(dbPath) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'my-layer.db');
    this.db     = null;
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
  }

  _createTables() {
    // OBSERVER pattern tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS observations (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp   TEXT NOT NULL,
        cycle       INTEGER,
        snapshot    TEXT,
        transitions TEXT
      );
    `);

    // ANALYST pattern tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp       TEXT NOT NULL,
        cycle           INTEGER,
        patterns        TEXT,
        recommendations TEXT
      );
    `);

    // SENTINEL pattern tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS anomalies (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        rule_id   TEXT,
        severity  TEXT,
        title     TEXT,
        detail    TEXT
      );
    `);
  }

  // ── OBSERVER ─────────────────────────────────────────────────────────────────

  logObservation(data) {
    this._save();
    this.db.run(
      'INSERT INTO observations (timestamp, cycle, snapshot, transitions) VALUES (?, ?, ?, ?)',
      [data.timestamp, data.cycle, data.snapshot, data.transitions]
    );
    this._save();
  }

  async getObservationCount() {
    const result = this.db.exec('SELECT COUNT(*) as count FROM observations');
    return result[0]?.values[0][0] || 0;
  }

  async getHistory(limit = 100) {
    const result = this.db.exec(
      `SELECT * FROM observations ORDER BY timestamp DESC LIMIT ${limit}`
    );
    if (!result[0]) return [];
    const [cols, ...rows] = [result[0].columns, ...result[0].values];
    return rows.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
  }

  // ── ANALYST ──────────────────────────────────────────────────────────────────

  logRecommendations(data) {
    this.db.run(
      'INSERT INTO recommendations (timestamp, cycle, patterns, recommendations) VALUES (?, ?, ?, ?)',
      [data.timestamp, data.cycle, data.patterns, data.recommendations]
    );
    this._save();
  }

  async getLatestRecommendations() {
    const result = this.db.exec(
      'SELECT * FROM recommendations ORDER BY timestamp DESC LIMIT 1'
    );
    if (!result[0]) return null;
    const cols = result[0].columns;
    const row  = result[0].values[0];
    return Object.fromEntries(cols.map((c, i) => [c, row[i]]));
  }

  // ── SENTINEL ─────────────────────────────────────────────────────────────────

  logAnomaly(data) {
    this.db.run(
      'INSERT INTO anomalies (timestamp, rule_id, severity, title, detail) VALUES (?, ?, ?, ?, ?)',
      [data.timestamp, data.rule_id, data.severity, data.title, data.detail]
    );
    this._save();
  }

  async getAnomalies(limit = 20) {
    const result = this.db.exec(
      `SELECT * FROM anomalies ORDER BY timestamp DESC LIMIT ${limit}`
    );
    if (!result[0]) return [];
    const [cols, ...rows] = [result[0].columns, ...result[0].values];
    return rows.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
  }

  async getAnomaliesBySeverity(severity) {
    const result = this.db.exec(
      `SELECT * FROM anomalies WHERE severity = '${severity}' ORDER BY timestamp DESC LIMIT 50`
    );
    if (!result[0]) return [];
    const [cols, ...rows] = [result[0].columns, ...result[0].values];
    return rows.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
  }

  // ── PERSIST ───────────────────────────────────────────────────────────────────

  _save() {
    if (!this.db) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  close() {
    try {
      this._save();
      this.db.close();
    } catch (e) {
      // silent
    }
  }

}

module.exports = LayerStorage;
