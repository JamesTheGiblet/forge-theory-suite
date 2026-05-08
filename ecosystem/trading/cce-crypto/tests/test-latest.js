const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data', 'cce-production.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));
  
  const result = db.exec('SELECT timestamp, btc_price, fear_greed, btc_dominance, portfolio_value, current_state FROM cce_cycles ORDER BY timestamp DESC LIMIT 1');
  
  if (result.length && result[0].values.length) {
    const row = result[0].values[0];
    console.log('Latest cycle:');
    console.log('  Timestamp:', row[0]);
    console.log('  BTC Price:', row[1]);
    console.log('  Fear & Greed:', row[2]);
    console.log('  BTC Dominance:', row[3]);
    console.log('  Portfolio Value:', row[4]);
    console.log('  Current State:', row[5]);
  } else {
    console.log('No results found');
  }
  
  db.close();
})();
