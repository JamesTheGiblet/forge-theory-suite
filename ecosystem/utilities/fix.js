const fs = require('fs');
let content = fs.readFileSync('/data/data/com.termux/files/home/forge-hq/server/index.js', 'utf8');

const oldForex = `      const forexRow = cceDb.exec(\`
        SELECT state, portfolio_value, price, z_score, rsi, session, timestamp
        FROM forex_cycles ORDER BY id DESC LIMIT 1
      \`);`;

const newForex = `      let forexRow = [];
      try {
        forexRow = cceDb.exec(\`
          SELECT state, portfolio_value, price, z_score, rsi, session, timestamp
          FROM forex_cycles ORDER BY id DESC LIMIT 1
        \`);
      } catch(e) {}`;

content = content.replace(oldForex, newForex);
fs.writeFileSync('/data/data/com.termux/files/home/forge-hq/server/index.js', content);
console.log('Done');
