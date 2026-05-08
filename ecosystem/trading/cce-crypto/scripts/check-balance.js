const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data', 'cce-production.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));
  
  const result = db.exec('SELECT timestamp, btc_holdings, usdc_holdings, portfolio_value FROM cce_cycles ORDER BY timestamp DESC LIMIT 3');
  if (result.length) {
    const { columns, values } = result[0];
    console.log('Latest cycles:');
    values.forEach(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      console.log(`  ${obj.timestamp}: BTC: ${obj.btc_holdings}, USDC: ${obj.usdc_holdings}, Portfolio: $${obj.portfolio_value}`);
    });
  } else {
    console.log('No portfolio data found');
  }
  db.close();
})();
