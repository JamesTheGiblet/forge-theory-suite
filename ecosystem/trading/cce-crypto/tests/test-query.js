const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data', 'cce-production.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));
  
  // Test the query
  const result = db.exec('SELECT timestamp, btc_price, fear_greed, btc_dominance, portfolio_value, current_state FROM cce_cycles ORDER BY timestamp DESC LIMIT 5');
  
  if (result.length) {
    const { columns, values } = result[0];
    console.log('Columns:', columns);
    console.log('Number of rows:', values.length);
    console.log('First row:', values[0]);
  } else {
    console.log('No results from query');
  }
  
  db.close();
})();
