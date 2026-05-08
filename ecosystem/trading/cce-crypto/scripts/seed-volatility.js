const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

(async () => {
  const dbPath = '/data/data/com.termux/files/home/cce-crypto/data/cme-production.db';
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));
  
  // Get last 30 prices
  const result = db.exec('SELECT price FROM cme_cycles ORDER BY timestamp DESC LIMIT 30');
  if (!result.length || result[0].values.length < 2) {
    console.log('Not enough data');
    db.close();
    return;
  }
  
  const prices = result[0].values.map(row => row[0]).reverse();
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const mean = returns.reduce((a,b) => a+b, 0) / returns.length;
  const variance = returns.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  const annualizedVol = dailyVol * Math.sqrt(252);
  const cceVol = annualizedVol * 100;
  console.log('CCE Volatility calculated:', cceVol.toFixed(2));
  
  // Update latest row
  db.run('UPDATE cme_cycles SET cce_volatility = ? WHERE id = (SELECT id FROM cme_cycles ORDER BY timestamp DESC LIMIT 1)', [cceVol]);
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  db.close();
  console.log('✅ Updated latest cycle with CCE Volatility');
})();
