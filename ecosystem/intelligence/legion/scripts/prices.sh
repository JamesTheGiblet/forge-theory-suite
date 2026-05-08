#!/bin/bash
cd ~/legion
node -e "
const { getAllPrices } = require('./shared/kraken_adapter');
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                    LEGION MK6 – LIVE PRICES                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
getAllPrices().then(prices => {
  for (const [asset, price] of Object.entries(prices)) {
    const emoji = asset === 'BTC/USD' ? '₿' : (asset === 'ETH/USD' ? '⟠' : '💰');
    console.log(`${emoji}  ${asset.padEnd(10)}: $${price.toFixed(asset === 'DOGE/USD' ? 4 : 2)}`);
  }
  console.log('');
});
"
