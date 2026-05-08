const { getCurrentPrice } = require('./shared/kraken_adapter.js');

async function test() {
  console.log('\n=== KRAKEN API TEST ===\n');
  const pairs = ['XBT/USD', 'ETH/USD', 'XBT/ETH', 'SOL/USD', 'XRP/USD', 'LINK/USD'];
  
  for (const pair of pairs) {
    try {
      const price = await getCurrentPrice(pair);
      if (price) {
        console.log(`✅ ${pair}: $${price}`);
      } else {
        console.log(`⚠️ ${pair}: No data`);
      }
    } catch (err) {
      console.log(`❌ ${pair}: ${err.message}`);
    }
  }
}

test();
