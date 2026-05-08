content = open('dashboard-server.js', 'r').read()

old = """app.get('/api/sentinel/status', (req, res) => {
  try {
    if (!sentinelEngine) return res.json({ active_anomalies: 0, active: [], recent: [] });
    res.json(sentinelEngine.getStatus());
  } catch(e) { res.status(500).json({ error: e.message }); }
});"""

new = """app.get('/api/sentinel/status', async (req, res) => {
  try {
    const path    = require('path');
    const fs      = require('fs');
    const dbPath  = path.join(__dirname, 'data', 'sentinel-production.db');
    if (!fs.existsSync(dbPath)) return res.json({ active_anomalies: 0, active: [], recent: [], total_anomalies: 0, total_cycles: 0, alert_count: 0, warn_count: 0, info_count: 0 });

    const initSqlJs = require('sql.js');
    const SQL  = await initSqlJs();
    const db   = new SQL.Database(fs.readFileSync(dbPath));

    const q = (sql, params) => {
      const r = db.exec(sql, params);
      if (!r.length) return [];
      const { columns, values } = r[0];
      return values.map(row => { const o = {}; columns.forEach((c,i) => o[c] = row[i]); return o; });
    };

    const active  = q('SELECT * FROM sentinel_anomalies WHERE resolved=0 ORDER BY timestamp DESC');
    const recent  = q('SELECT * FROM sentinel_anomalies ORDER BY timestamp DESC LIMIT 20');
    const totals  = q('SELECT COUNT(*) as c FROM sentinel_anomalies')[0] || { c: 0 };
    const cycles  = q('SELECT COUNT(*) as c FROM sentinel_cycles')[0] || { c: 0 };

    db.close();

    res.json({
      active_anomalies: active.length,
      alert_count:      active.filter(a => a.severity === 'ALERT').length,
      warn_count:       active.filter(a => a.severity === 'WARN').length,
      info_count:       active.filter(a => a.severity === 'INFO').length,
      total_anomalies:  totals.c,
      total_cycles:     cycles.c,
      active,
      recent,
      last_run:         new Date().toISOString()
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});"""

content = content.replace(old, new)
open('dashboard-server.js', 'w').write(content)
print('done')
