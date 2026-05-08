const fs = require('fs');
let content = fs.readFileSync('/data/data/com.termux/files/home/forge-hq/server/index.js', 'utf8');

const oldRoute = `app.get('/api/cce/status', (req, res) => {`;

const newRoute = `app.get('/api/cce/status', (req, res) => {
  const ccePath = process.env.HOME + '/cce-crypto/data/cce-production.db';
  if (!fs.existsSync(ccePath)) return res.json({ error: 'CCE database not found' });
  const initSqlJs = require('sql.js');
  initSqlJs().then(SQL => {
    const cceDb = new SQL.Database(fs.readFileSync(ccePath));
    let crypto = null, forex = null;
    try {
      const r = cceDb.exec('SELECT current_state, portfolio_value, btc_price, fear_greed, total_return, daily_return FROM cce_cycles ORDER BY id DESC LIMIT 1');
      if (r[0]?.values[0]) {
        const v = r[0].values[0];
        crypto = { state: v[0], portfolio: v[1], btc_price: v[2], fear_greed: v[3], total_return: v[4], daily_return: v[5] };
      }
    } catch(e) {}
    try {
      const r = cceDb.exec('SELECT state, portfolio_value, price, z_score, rsi, session FROM forex_cycles ORDER BY id DESC LIMIT 1');
      if (r[0]?.values[0]) {
        const v = r[0].values[0];
        forex = { state: v[0], portfolio: v[1], price: v[2], z_score: v[3], rsi: v[4], session: v[5] };
      }
    } catch(e) {}
    cceDb.close();
    res.json({ crypto, forex });
  }).catch(e => res.json({ error: e.message }));
  return;
  // original code below replaced`;

content = content.replace(oldRoute, newRoute);
fs.writeFileSync('/data/data/com.termux/files/home/forge-hq/server/index.js', content);
console.log('Done');
