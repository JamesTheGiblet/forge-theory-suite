// Kraken balance fetcher for CCE
const KrakenClient = require('kraken-api');

let kraken = null;

function initKraken(apiKey, apiSecret) {
  if (!apiKey || !apiSecret) return null;
  if (!kraken) {
    kraken = new KrakenClient(apiKey, apiSecret);
  }
  return kraken;
}

async function getKrakenBalance(apiKey, apiSecret) {
  const kraken = initKraken(apiKey, apiSecret);
  if (!kraken) {
    console.log('⚠️ Kraken API keys not configured, using mock balance');
    return { usdc: 291.7, total: 291.7 };
  }
  
  try {
    const balance = await kraken.api('Balance');
    let totalUSD = 0;
    let usdcBalance = 0;
    
    for (const [asset, amount] of Object.entries(balance.result)) {
      const numAmount = parseFloat(amount);
      if (asset === 'USDC' || asset === 'USD') {
        usdcBalance += numAmount;
        totalUSD += numAmount;
      }
      // Add BTC conversion if you hold BTC
      if (asset === 'XXBT' || asset === 'XBT') {
        const ticker = await kraken.api('Ticker', { pair: 'XBTUSD' });
        const btcPrice = parseFloat(ticker.result.XXBTZUSD.c[0]);
        totalUSD += numAmount * btcPrice;
      }
    }
    
    console.log(`💰 Kraken balance fetched: $${totalUSD.toFixed(2)} USDC`);
    return { usdc: usdcBalance, total: totalUSD };
  } catch (err) {
    console.error('❌ Failed to fetch Kraken balance:', err.message);
    return { usdc: 291.7, total: 291.7 };
  }
}

module.exports = { getKrakenBalance };
