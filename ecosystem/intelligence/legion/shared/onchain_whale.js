const https = require('https');

const WHALE_ADDRESSES = {
  BTC: {
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa': 'Satoshi',
    '3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb': 'Binance Hot'
  }
};

async function getAddressTransactions(address, limit = 5) {
  return new Promise((resolve) => {
    https.get(`https://mempool.space/api/address/${address}/txs`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const txs = JSON.parse(data);
          resolve(txs.slice(0, limit));
        } catch(e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function scanWhaleActivity() {
  console.log('[ONCHAIN] Scanning whale addresses...');
  for (const [chain, addresses] of Object.entries(WHALE_ADDRESSES)) {
    for (const [address, label] of Object.entries(addresses)) {
      const txs = await getAddressTransactions(address, 3);
      if (txs.length > 0) {
        console.log(`[ONCHAIN] ${label} (${chain}): ${txs.length} recent transactions`);
      }
    }
  }
}

function startOnChainWhale() {
  console.log('[ONCHAIN] Whale tracker active – scanning every 30 minutes');
  scanWhaleActivity();
  setInterval(scanWhaleActivity, 30 * 60 * 1000);
}

module.exports = { startOnChainWhale, scanWhaleActivity };
