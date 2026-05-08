// scripts/fetch-alt.js
// Batch fetch altcoin historical OHLCV data from Yahoo Finance

'use strict';

const path = require('path');
const { fetchYahooHistoricalData } = require('./fetch-historical-data');

const START_DATE = '2015-01-01'; // Covers ETH launch; Yahoo handles missing early data gracefully
const END_DATE = new Date().toISOString().split('T')[0]; // Today — always fetch up to now

const ASSETS = [
  { symbol: 'ETH-USD',  file: 'eth_historical.csv'  },
  { symbol: 'SOL-USD',  file: 'sol_historical.csv'  },
  { symbol: 'RNDR-USD', file: 'rndr_historical.csv' },
  { symbol: 'FET-USD',  file: 'fet_historical.csv'  }
];

const DATA_DIR = path.join(__dirname, '..', 'data');
const DELAY_MS = 1500; // Courtesy delay between Yahoo Finance requests

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAlts() {
  console.log('🚀 Starting Batch Altcoin Fetch (Yahoo Finance)...');
  console.log(`📅 Range: ${START_DATE} → ${END_DATE}\n`);

  const results = { success: [], failed: [] };

  for (const asset of ASSETS) {
    const outputPath = path.join(DATA_DIR, asset.file);
    try {
      await fetchYahooHistoricalData(START_DATE, END_DATE, outputPath, asset.symbol);
      results.success.push(asset.symbol);
      console.log('');
    } catch (err) {
      console.error(`❌ Failed to fetch ${asset.symbol}:`, err.message);
      results.failed.push(asset.symbol);
    }

    // Courtesy delay between requests — skip after last asset
    if (asset !== ASSETS[ASSETS.length - 1]) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n📊 Batch fetch complete.');
  console.log(`   ✅ Success: ${results.success.join(', ') || 'none'}`);
  if (results.failed.length > 0) {
    console.log(`   ❌ Failed:  ${results.failed.join(', ')}`);
    process.exit(1); // Signal partial failure to calling process
  }
}

fetchAlts().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});