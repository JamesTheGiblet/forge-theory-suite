const { sendMessage, registerHandler } = require('../bus/router');

let marketData = {
  sentiment: 50,
  fearGreed: 50,
  btcDominance: 50,
  volume24h: 0
};

async function fetchMarketData() {
  try {
    // Simple market data simulation
    marketData = {
      sentiment: Math.floor(Math.random() * 100),
      fearGreed: Math.floor(Math.random() * 100),
      btcDominance: 40 + Math.random() * 20,
      volume24h: Math.random() * 1000000000,
      timestamp: Date.now()
    };
    return marketData;
  } catch (err) {
    console.error('[MARKET_INTEL] Error:', err.message);
    return marketData;
  }
}

function startMarketIntel() {
  registerHandler('MARKET_DATA_REQUEST', async () => {
    const data = await fetchMarketData();
    sendMessage('market_intel', 'MARKET_DATA_RESPONSE', data);
  });
  
  // Update every minute
  setInterval(fetchMarketData, 60000);
  console.log('[MARKET_INTEL] Ready');
}

module.exports = { startMarketIntel, fetchMarketData };
