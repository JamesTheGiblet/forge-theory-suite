const https = require('https');
const { sendMessage } = require('../bus/router');

// Known whale addresses (example - you can add more)
const WHALE_ADDRESSES = {
  BTC: {
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa': 'Satoshi',
    'bc1qazcm763858nkj2dj986etajv6wquslv8a5q6qf': 'Binance Cold',
    '3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb': 'Binance Hot'
  },
  ETH: {
    '0x28c6c06298d514db089934071355e5743bf21d60': 'Crypto.com',
    '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8': 'Binance',
    '0xab5801a7d398351b8be11c439e05c5b3259aec9b': 'MakerDAO'
  }
};

async function getLatestBitcoinBlocks() {
  return new Promise((resolve) => {
    https.get('https://mempool.space/api/v1/blocks', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const blocks = JSON.parse(data);
          resolve(blocks.slice(0, 5));
        } catch(e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function getTransaction(txid) {
  return new Promise((resolve) => {
    https.get(`https://mempool.space/api/tx/${txid}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tx = JSON.parse(data);
          resolve(tx);
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function getAddressTransactions(address, limit = 10) {
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

async function getEthereumLatestBlock() {
  return new Promise((resolve) => {
    https.get('https://api.etherscan.io/api?module=proxy&action=eth_blockNumber', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const blockNumber = parseInt(json.result, 16);
          resolve(blockNumber);
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function scanWhaleActivity() {
  console.log('[ONCHAIN] Scanning whale addresses...');
  
  for (const [chain, addresses] of Object.entries(WHALE_ADDRESSES)) {
    for (const [address, label] of Object.entries(addresses)) {
      const txs = await getAddressTransactions(address, 5);
      if (txs.length > 0) {
        console.log(`[ONCHAIN] ${label} (${chain}): ${txs.length} recent transactions`);
        // Alert for large transactions
        for (const tx of txs) {
          const value = tx.value / 100000000;
          if (value > 100) { // 100+ BTC
            sendMessage('diplomat', 'WHALE_ACTIVITY', {
              chain,
              address,
              label,
              txid: tx.txid,
              amount: value,
              timestamp: tx.status?.block_time
            });
          }
        }
      }
    }
  }
}

async function startOnChainIntel() {
  console.log('[ONCHAIN] Intelligence active – scanning every 30 minutes');
  await scanWhaleActivity();
  setInterval(() => scanWhaleActivity(), 30 * 60 * 1000);
}

module.exports = { 
  getLatestBitcoinBlocks, 
  getTransaction, 
  getAddressTransactions,
  getEthereumLatestBlock,
  scanWhaleActivity,
  startOnChainIntel,
  WHALE_ADDRESSES
};
