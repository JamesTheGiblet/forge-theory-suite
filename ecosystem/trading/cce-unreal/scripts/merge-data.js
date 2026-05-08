// scripts/merge-data.js
// Merge BTC OHLCV CSV with Fear & Greed, Dominance, and altcoin data

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node scripts/merge-data.js <btc_csv> <fg_csv> [dominance_csv] [eth_csv] [sol_csv] [rndr_csv] [fet_csv] [output_csv]');
  console.log('');
  console.log('Required:');
  console.log('  btc_csv       BTC OHLCV CSV (date,open,high,low,close,volume)');
  console.log('  fg_csv        Fear & Greed CSV (date,fear_greed)');
  console.log('');
  console.log('Optional (pass empty string "" to skip):');
  console.log('  dominance_csv BTC Dominance CSV');
  console.log('  eth_csv       ETH close prices');
  console.log('  sol_csv       SOL close prices');
  console.log('  rndr_csv      RNDR close prices');
  console.log('  fet_csv       FET close prices');
  console.log('  output_csv    Output path (default: <btc_dir>/btc_historical_merged.csv)');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/merge-data.js ./data/btc.csv ./data/fng.csv ./data/dom.csv ./data/eth.csv "" "" "" ./data/merged.csv');
  process.exit(1);
}

const [btcPath, fgPath, domPath, ethPath, solPath, rndrPath, fetPath, outputArg] = args;

// ============================================================================
// VALIDATION
// ============================================================================

function requireFile(filePath, label) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`❌ Required file not found: ${label} → ${filePath}`);
    process.exit(1);
  }
}

requireFile(btcPath, 'btc_csv');
requireFile(fgPath, 'fg_csv');

// ============================================================================
// CSV READER
// ============================================================================

/**
 * Read a CSV file into a Map of { date string → value string }.
 * Handles Unix timestamps, ISO dates, and YYYY-MM-DD formats.
 * Value column is selected by first header matching: value, close, fng, dominance.
 * Falls back to second column if no match found.
 */
function readCsv(filePath) {
  if (!filePath || filePath === '' || !fs.existsSync(filePath)) {
    if (filePath && filePath !== '') {
      console.warn(`⚠️  Optional file not found, skipping: ${filePath}`);
    }
    return new Map();
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  // Date column: prefer 'date', then 'time', then 'timestamp', then first column
  let dateIdx = headers.indexOf('date');
  if (dateIdx === -1) dateIdx = headers.indexOf('time');
  if (dateIdx === -1) dateIdx = headers.indexOf('timestamp');
  if (dateIdx === -1) dateIdx = 0;

  // Value column: prefer named columns, fallback to second column
  let valIdx = headers.findIndex(h =>
    h.includes('close') || h.includes('fear_greed') || h.includes('fng') ||
    h.includes('dominance') || h.includes('value')
  );
  if (valIdx === -1) valIdx = 1;

  const data = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    let dateStr = cols[dateIdx]?.trim();
    if (!dateStr) continue;

    // Normalise date — handle Unix timestamp (seconds), ISO, or YYYY-MM-DD
    if (/^\d{10,}$/.test(dateStr)) {
      dateStr = new Date(parseInt(dateStr) * 1000).toISOString().split('T')[0];
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
    }

    const val = cols[valIdx]?.trim();
    if (dateStr && val) data.set(dateStr, val);
  }

  return data;
}

// ============================================================================
// LOAD
// ============================================================================

console.log('🔄 Reading files...');

const btcContent = fs.readFileSync(btcPath, 'utf8').trim().split('\n');
const btcHeaders = btcContent[0];
const btcRows = btcContent.slice(1);
console.log(`   - Loaded ${btcRows.length} BTC rows`);

const fgData   = readCsv(fgPath);
const domData  = readCsv(domPath);
const ethData  = readCsv(ethPath);
const solData  = readCsv(solPath);
const rndrData = readCsv(rndrPath);
const fetData  = readCsv(fetPath);

if (fgData.size)   console.log(`   - Loaded ${fgData.size} Fear & Greed records`);
if (domData.size)  console.log(`   - Loaded ${domData.size} Dominance records`);
if (ethData.size)  console.log(`   - Loaded ${ethData.size} ETH records`);
if (solData.size)  console.log(`   - Loaded ${solData.size} SOL records`);
if (rndrData.size) console.log(`   - Loaded ${rndrData.size} RNDR records`);
if (fetData.size)  console.log(`   - Loaded ${fetData.size} FET records`);

// ============================================================================
// MERGE
// ============================================================================

console.log('\n🔄 Merging data...');

let completeRows = 0;
let partialRows = 0;

const newHeaders = `${btcHeaders},fear_greed,btc_dominance,eth_close,sol_close,rndr_close,fet_close`;

const newRows = btcRows.map(row => {
  const cols = row.split(',');

  // Normalise BTC date using same logic as readCsv
  let dateStr = cols[0]?.trim();
  if (/^\d{10,}$/.test(dateStr)) {
    dateStr = new Date(parseInt(dateStr) * 1000).toISOString().split('T')[0];
  } else {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
  }

  const fg   = fgData.get(dateStr)   || '';
  const dom  = domData.get(dateStr)  || '';
  const eth  = ethData.get(dateStr)  || '';
  const sol  = solData.get(dateStr)  || '';
  const rndr = rndrData.get(dateStr) || '';
  const fet  = fetData.get(dateStr)  || '';

  const hasAllOptional = [dom, eth, sol, rndr, fet].every(v => v !== '');
  const hasFg = fg !== '';

  if (hasFg && hasAllOptional) completeRows++;
  else partialRows++;

  return `${row},${fg},${dom},${eth},${sol},${rndr},${fet}`;
});

// ============================================================================
// WRITE
// ============================================================================

const outputPath = (outputArg && outputArg !== '')
  ? outputArg
  : path.join(path.dirname(btcPath), 'btc_historical_merged.csv');

fs.writeFileSync(outputPath, [newHeaders, ...newRows].join('\n'));

console.log(`\n✅ Merged data saved to: ${outputPath}`);
console.log(`   Total rows : ${newRows.length}`);
console.log(`   Complete   : ${completeRows}`);
console.log(`   Partial    : ${partialRows} (some columns empty — expected for early dates)`);
console.log(`\n   Run backtest: node tests/backtest.js "${outputPath}"`);