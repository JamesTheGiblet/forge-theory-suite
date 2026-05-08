#!/bin/bash
cd ~/legion
node -e "
const { CryptoVIX } = require('./shared/crypto_vix');
const vix = new CryptoVIX();
vix.getAllVIX().then(results => {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    CRYPTO VIX INDEX                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  for (const r of results) {
    console.log(`  ${r.emoji} ${r.asset.padEnd(10)}: ${r.vix || 'N/A'} - ${r.interpretation}`);
  }
  console.log('');
});
"
