// scripts/verify-data.js
// Inspect database records for debugging and verification

'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'cce-production.db');

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found: ${dbPath}`);
  console.error('   Has the engine run at least once?');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Failed to open database:', err.message);
    process.exit(1);
  }
});

console.log('🔍 Verifying Database Records...\n');
console.log(`📂 Database: ${dbPath}\n`);

function queryAll(sql, label, formatter) {
  return new Promise((resolve, reject) => {
    console.log(label);
    let count = 0;

    db.each(
      sql,
      (err, row) => {
        if (err) {
          console.error(`   ❌ Row error: ${err.message}`);
          return;
        }
        console.log('   ' + formatter(row));
        count++;
      },
      (err, total) => {
        if (err) return reject(err);
        if (count === 0) console.log('   (no records found)');
        console.log(`   — ${total} record(s)\n`);
        resolve();
      }
    );
  });
}

async function verify() {
  await queryAll(
    'SELECT * FROM state_history ORDER BY timestamp ASC',
    '📜 State History:',
    row => `${row.timestamp}: ${row.from_state} ➡️  ${row.to_state} (${row.reason || 'N/A'})`
  );

  await queryAll(
    'SELECT * FROM trades ORDER BY timestamp ASC',
    '🛒 Trades:',
    row => {
      const amount = parseFloat(row.amount).toFixed(6);
      const price  = parseFloat(row.price).toFixed(2);
      const value  = parseFloat(row.value).toFixed(2);
      return `${row.timestamp}: ${row.side.toUpperCase()} ${amount} ${row.symbol} @ $${price} (Val: $${value})`;
    }
  );

  await queryAll(
    'SELECT * FROM cycle_data ORDER BY timestamp DESC LIMIT 10',
    '🔄 Latest Cycle Data (last 10):',
    row => `${row.timestamp}: state=${row.current_state} portfolio=$${parseFloat(row.portfolio_value || 0).toFixed(2)} btc=$${parseFloat(row.btc_price || 0).toFixed(2)}`
  );
}

verify()
  .catch(err => {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  })
  .finally(() => {
    db.close();
  });