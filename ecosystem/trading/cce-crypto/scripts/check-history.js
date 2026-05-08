const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const dbPath = './data/cce-production.db';
  if (!fs.existsSync(dbPath)) {
    console.log('Database not found at', dbPath);
    return;
  }
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const result = db.exec('SELECT COUNT(*) as count FROM cce_cycles');
  console.log('Row count:', result[0].values[0][0]);
  
  const sample = db.exec('SELECT * FROM cce_cycles ORDER BY timestamp DESC LIMIT 3');
  if (sample.length) {
    const { columns, values } = sample[0];
    console.log('Sample rows:', values.map(row => {
      let obj = {};
      columns.forEach((c,i) => obj[c]=row[i]);
      return obj;
    }));
  } else {
    console.log('No rows in cce_cycles');
  }
  db.close();
})();
