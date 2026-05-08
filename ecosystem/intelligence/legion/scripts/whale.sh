#!/bin/bash
cd ~/legion
node -e "
const { getWhaleSummary } = require('./shared/onchain');
getWhaleSummary().then(s => {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    WHALE ACTIVITY SUMMARY                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Total Value:    $' + (s.totalValue / 1000000).toFixed(1) + 'M');
  console.log('  Sentiment:      ' + s.sentiment.toUpperCase());
  console.log('  Assets moved:   ' + Object.keys(s.assets).join(', '));
  if (s.largestTx) {
    console.log('  Largest Tx:     ' + s.largestTx.amount + ' ' + s.largestTx.symbol + ' ($' + (s.largestTx.amount_usd / 1000000).toFixed(1) + 'M)');
  }
  console.log('');
});
"
