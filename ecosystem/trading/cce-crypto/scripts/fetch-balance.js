require('dotenv').config();
const KrakenClient = require('kraken-api');

const kraken = new KrakenClient(
  process.env.KRAKEN_API_KEY,
  process.env.KRAKEN_API_SECRET
);

async function getBalance() {
  try {
    const balance = await kraken.api('Balance');
    console.log('✅ Real Kraken Balance:');
    
    let totalUSD = 0;
    for (const [asset, amount] of Object.entries(balance.result)) {
      console.log(`   ${asset}: ${amount}`);
      if (asset === 'USDC' || asset === 'USD') {
        totalUSD += parseFloat(amount);
      }
    }
    
    console.log(`\n💰 Total Portfolio Value: $${totalUSD.toFixed(2)}`);
    
    // Also get BTC price
    const ticker = await kraken.api('Ticker', { pair: 'XBTUSD' });
    const btcPrice = ticker.result.XXBTZUSD.c[0];
    console.log(`📊 Current BTC Price: $${btcPrice}`);
    
  } catch (err) {
    console.error('❌ Error fetching balance:', err.message);
  }
}

getBalance();
