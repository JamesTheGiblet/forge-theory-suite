#!/usr/bin/env node
/**
 * collect_daily.js
 * Fetches missing daily candles from Kraken and appends to candles.json.
 * Runs once daily (e.g., at 5:30 AM UTC) before regime_watcher.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const CANDLE_JSON = path.join(__dirname, 'candles.json');
const PAIR = 'BTC/USD';
const INTERVAL = 1440; // 1 day in minutes

// Fetch daily candles from Kraken (no dependencies)
function fetchKrakenOHLC(pair, interval = 1440, since = null) {
  return new Promise((resolve, reject) => {
    let url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}`;
    if (since) url += `&since=${since}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error && json.error.length) return reject(json.error[0]);
          if (!json.result) return reject('No result');
          const pairKey = Object.keys(json.result).find(k => k !== 'last');
          if (!pairKey) return reject('Pair not found');
          const candles = json.result[pairKey].map(c => ({
            pair: pair,
            interval: '1D',
            timestamp: c[0],
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[7])
          }));
          resolve({ candles, lastId: json.result.last });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Load existing candles, find last timestamp for BTC/USD 1D
function getLastTimestamp() {
  if (!fs.existsSync(CANDLE_JSON)) return null;
  const data = JSON.parse(fs.readFileSync(CANDLE_JSON, 'utf8'));
  const btcDaily = data.filter(c => c.pair === PAIR && c.interval === '1D')
                        .sort((a,b) => a.timestamp - b.timestamp);
  if (btcDaily.length === 0) return null;
  return btcDaily[btcDaily.length-1].timestamp;
}

// Append new candles, deduplicate by timestamp
function appendCandles(newCandles) {
  let existing = [];
  if (fs.existsSync(CANDLE_JSON)) {
    existing = JSON.parse(fs.readFileSync(CANDLE_JSON, 'utf8'));
  }
  const existingTimestamps = new Set(existing.map(c => c.timestamp));
  const toAdd = newCandles.filter(c => !existingTimestamps.has(c.timestamp));
  if (toAdd.length === 0) return 0;
  const all = [...existing, ...toAdd];
  all.sort((a,b) => a.timestamp - b.timestamp);
  fs.writeFileSync(CANDLE_JSON, JSON.stringify(all, null, 2));
  return toAdd.length;
}

async function main() {
  console.log('📥 Daily Candle Collector');
  console.log('═'.repeat(40));
  const lastTs = getLastTimestamp();
  const today = new Date();
  today.setHours(0,0,0,0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayTs = Math.floor(yesterday.getTime() / 1000);

  if (lastTs && lastTs >= yesterdayTs) {
    console.log(`✅ Already have candles up to ${new Date(lastTs*1000).toISOString().slice(0,10)}. No update needed.`);
    return;
  }

  const since = lastTs ? lastTs + 86400 : null; // start from day after last candle
  console.log(`📡 Fetching missing daily candles since ${since ? new Date(since*1000).toISOString().slice(0,10) : 'beginning'}...`);
  try {
    const { candles } = await fetchKrakenOHLC(PAIR, INTERVAL, since);
    if (candles.length === 0) {
      console.log('⚠️ No new candles returned.');
      return;
    }
    const added = appendCandles(candles);
    console.log(`✅ Added ${added} new candles. Last date: ${new Date(candles[candles.length-1].timestamp*1000).toISOString().slice(0,10)}`);
  } catch (err) {
    console.error(`❌ Failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
