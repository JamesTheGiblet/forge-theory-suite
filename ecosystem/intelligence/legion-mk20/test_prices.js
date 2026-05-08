const https = require('https');

const testPairs = [
  { name: 'BTC/USD', kraken: 'XXBTZUSD' },
  { name: 'ETH/USD', kraken: 'XETHZUSD' },
  { name: 'BTC/ETH', kraken: 'XXBTZETH' },
  { name: 'SOL/USD', kraken: 'SOLUSD' },
  { name: 'XRP/USD', kraken: 'XXRPZUSD' },
  { name: 'LINK/USD', kraken: 'LINKUSD' }
];

async function getPrice(krakenPair) {
  return new Promise((resolve) => {
    const url = `https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.result) {
            const pairKey = Object.keys(json.result)[0];
            const price = parseFloat(json.result[pairKey].c[0]);
            resolve(price);
          } else {
            resolve(null);
          }
        } catch (err) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function test() {
  console.log('\n=== KRAKEN PRICE TEST ===\n');
  for (const pair of testPairs) {
    const price = await getPrice(pair.kraken);
    if (price) {
      console.log(`✅ ${pair.name} (${pair.kraken}): $${price}`);
    } else {
      console.log(`❌ ${pair.name} (${pair.kraken}): No data`);
    }
  }
}

test();
