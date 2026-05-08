require('dotenv').config();
const KrakenClient = require('kraken-api');

const apiKey = process.env.KRAKEN_API_KEY;
const apiSecret = process.env.KRAKEN_API_SECRET;

if (!apiKey || !apiSecret) {
  console.log('❌ Kraken API keys not found in .env');
  console.log('Add:');
  console.log('  KRAKEN_API_KEY=your_key_here');
  console.log('  KRAKEN_API_SECRET=your_secret_here');
  process.exit(1);
}

const kraken = new KrakenClient(apiKey, apiSecret);

async function getBalance() {
  try {
    const balance = await kraken.api('Balance');
    console.log('✅ Kraken connection successful!');
    console.log('Balance:', balance.result);
    
    // Calculate total USD value
    let totalUSD = 0;
    for (const [asset, amount] of Object.entries(balance.result)) {
      if (asset === 'ZUSD') {
        totalUSD += parseFloat(amount);
      } else if (amount > 0) {
        // For crypto, we'd need to get price, but this is a start
        console.log(`  ${asset}: ${amount}`);
      }
    }
    console.log(`\nTotal USD balance: $${totalUSD.toFixed(2)}`);
  } catch (err) {
    console.log('❌ Kraken connection failed:', err.message);
  }
}

getBalance();
