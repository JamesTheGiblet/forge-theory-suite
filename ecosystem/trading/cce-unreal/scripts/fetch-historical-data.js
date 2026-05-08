// scripts/fetch-historical-data.js
// Download BTC historical OHLCV data for backtesting

'use strict';

const fs = require('fs');
const axios = require('axios');
const ccxt = require('ccxt');
const path = require('path');
require('dotenv').config();

// ============================================================================
// UTILITIES
// ============================================================================

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function safeCoinGeckoRequest(url, headers) {
  try {
    return await axios.get(url, { headers });
  } catch (error) {
    if (error.response?.status === 401 && headers['x-cg-demo-api-key']) {
      console.warn('⚠️  401 Unauthorized (Invalid API Key). Retrying without key...');
      const fallbackHeaders = { ...headers };
      delete fallbackHeaders['x-cg-demo-api-key'];
      return await axios.get(url, { headers: fallbackHeaders });
    }
    throw error;
  }
}

function warnIgnoredDates(source) {
  console.warn(`⚠️  Note: ${source} fetches all available history — start/end date args are ignored.`);
}

// ============================================================================
// KRAKEN
// ============================================================================

async function fetchKrakenHistoricalData(startDate, endDate, outputPath) {
  console.log('🌐 Fetching BTC/USD historical data from Kraken...');
  console.log(`📅 Range: ${startDate} → ${endDate}`);

  const kraken = new ccxt.kraken();
  const since = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  const allCandles = [];
  const seenTimestamps = new Set();
  let currentTime = since;

  while (currentTime < end) {
    try {
      console.log(`   Fetching from ${new Date(currentTime).toISOString().split('T')[0]}...`);

      const ohlcv = await kraken.fetchOHLCV('BTC/USD', '1d', currentTime, 720);
      if (ohlcv.length === 0) break;

      for (const candle of ohlcv) {
        if (!seenTimestamps.has(candle[0])) {
          seenTimestamps.add(candle[0]);
          allCandles.push(candle);
        }
      }

      currentTime = ohlcv[ohlcv.length - 1][0] + 86400000;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error('❌ Fetch error:', err.message);
      break;
    }
  }

  console.log(`✅ Fetched ${allCandles.length} daily candles`);

  const csv = [
    'date,open,high,low,close,volume',
    ...allCandles.map(([time, open, high, low, close, volume]) =>
      `${new Date(time).toISOString().split('T')[0]},${open},${high},${low},${close},${volume}`
    )
  ].join('\n');

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, csv);
  console.log(`💾 Saved to: ${outputPath}`);

  return allCandles.length;
}

// ============================================================================
// COINGECKO
// ============================================================================

async function fetchCoinGeckoHistoricalData(startDate, endDate, outputPath) {
  console.log('🦎 Fetching BTC/USD historical data from CoinGecko...');
  console.log(`📅 Range: ${startDate} → ${endDate}`);

  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(new Date(endDate).getTime() / 1000);

  try {
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${start}&to=${end}`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json'
    };

    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }

    const response = await safeCoinGeckoRequest(url, headers);

    if (!response.data?.prices) {
      throw new Error('Invalid response from CoinGecko');
    }

    const dailyData = aggregateToDailyOHLCV(response.data.prices, response.data.total_volumes);
    console.log(`✅ Fetched and aggregated ${dailyData.length} daily candles`);

    const csv = [
      'date,open,high,low,close,volume',
      ...dailyData.map(d => `${d.date},${d.open},${d.high},${d.low},${d.close},${d.volume}`)
    ].join('\n');

    ensureDir(outputPath);
    fs.writeFileSync(outputPath, csv);
    console.log(`💾 Saved to: ${outputPath}`);

    return dailyData.length;
  } catch (err) {
    if (err.response?.status === 401) {
      console.error('❌ Error 401: CoinGecko requires an API key.');
      console.error('   1. Get a free key: https://www.coingecko.com/en/api');
      console.error('   2. Add COINGECKO_API_KEY=your_key to .env');
    } else {
      console.error('❌ Fetch error:', err.message);
    }
    throw err;
  }
}

// ============================================================================
// YAHOO FINANCE
// ============================================================================

async function fetchYahooHistoricalData(startDate, endDate, outputPath, symbol = 'BTC-USD') {
  console.log(`📈 Fetching ${symbol} historical data from Yahoo Finance...`);
  console.log(`📅 Range: ${startDate} → ${endDate}`);

  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(new Date(endDate).getTime() / 1000);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) throw new Error('Invalid response from Yahoo Finance');

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const dailyData = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] && quote.open[i] !== null && quote.close[i] !== null) {
        dailyData.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i] || 0
        });
      }
    }

    console.log(`✅ Fetched ${dailyData.length} daily candles`);

    const csv = [
      'date,open,high,low,close,volume',
      ...dailyData.map(d => `${d.date},${d.open},${d.high},${d.low},${d.close},${d.volume}`)
    ].join('\n');

    ensureDir(outputPath);
    fs.writeFileSync(outputPath, csv);
    console.log(`💾 Saved to: ${outputPath}`);

    return dailyData.length;
  } catch (err) {
    console.error('❌ Fetch error:', err.message);
    throw err;
  }
}

// ============================================================================
// FEAR & GREED
// ============================================================================

async function fetchFearGreedData(outputPath) {
  console.log('😨 Fetching Fear & Greed Index history...');

  const url = 'https://api.alternative.me/fng/?limit=0&format=json';

  try {
    const response = await axios.get(url);
    const data = response.data.data;

    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid API response format');
    }

    data.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

    const csvLines = [
      'date,fear_greed',
      ...data.map(item => {
        const date = new Date(parseInt(item.timestamp) * 1000).toISOString().split('T')[0];
        return `${date},${item.value}`;
      })
    ];

    ensureDir(outputPath);
    fs.writeFileSync(outputPath, csvLines.join('\n'));
    console.log(`✅ Saved ${data.length} days of Fear & Greed data to ${outputPath}`);

    return data.length;
  } catch (err) {
    console.error('❌ Failed to fetch Fear & Greed:', err.message);
    throw err;
  }
}

// ============================================================================
// BTC DOMINANCE
// ============================================================================

async function fetchBtcDominanceData(outputPath) {
  console.log('📊 Fetching BTC Dominance proxy data from Yahoo Finance...');
  console.log('   (Proxy formula: BTC / (BTC + ETH × 25) — approximates market cap share)');

  const start = 1356998400; // Jan 2013 — full available history
  const end = Math.floor(Date.now() / 1000);
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

  try {
    const [btcRes, ethRes] = await Promise.all([
      axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${start}&period2=${end}&interval=1d`, { headers }),
      axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/ETH-USD?period1=${start}&period2=${end}&interval=1d`, { headers })
    ]);

    const getQuotes = (res) => {
      const result = res.data?.chart?.result?.[0];
      if (!result) return new Map();
      const map = new Map();
      const timestamps = result.timestamp;
      const closes = result.indicators.quote[0].close;
      for (let i = 0; i < timestamps.length; i++) {
        if (timestamps[i] && closes[i]) {
          map.set(new Date(timestamps[i] * 1000).toISOString().split('T')[0], closes[i]);
        }
      }
      return map;
    };

    const btcPrices = getQuotes(btcRes);
    const ethPrices = getQuotes(ethRes);

    const dates = Array.from(btcPrices.keys()).sort();
    let count = 0;

    const csvLines = ['date,btc_dominance'];
    for (const date of dates) {
      const btc = btcPrices.get(date);
      const eth = ethPrices.get(date);

      if (btc) {
        // Before ETH existed, assume near-total dominance
        const dominance = eth
          ? (btc / (btc + eth * 25)) * 100
          : 99.0;
        csvLines.push(`${date},${dominance.toFixed(2)}`);
        count++;
      }
    }

    ensureDir(outputPath);
    fs.writeFileSync(outputPath, csvLines.join('\n'));
    console.log(`✅ Saved ${count} days of Dominance proxy data to ${outputPath}`);

    return count;
  } catch (err) {
    console.error('❌ Failed to fetch Dominance:', err.message);
    throw err;
  }
}

// ============================================================================
// AGGREGATION
// ============================================================================

function aggregateToDailyOHLCV(priceData, volumeData) {
  const dayMap = new Map();

  // Price data from CoinGecko is returned in chronological order within a day,
  // so first entry = open, last entry = close. High/low tracked across all ticks.
  for (const [timestamp, price] of priceData) {
    const date = new Date(timestamp).toISOString().split('T')[0];

    if (!dayMap.has(date)) {
      dayMap.set(date, { date, open: price, high: price, low: price, close: price, volume: 0 });
    }

    const day = dayMap.get(date);
    day.high = Math.max(day.high, price);
    day.low = Math.min(day.low, price);
    day.close = price; // Last price seen for the day
  }

  if (volumeData) {
    for (const [timestamp, vol] of volumeData) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      if (dayMap.has(date)) {
        dayMap.get(date).volume = vol;
      }
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('\nUsage: node scripts/fetch-historical-data.js <source> <start-date> <end-date> [output-path] [symbol]');
    console.log('\nSources:');
    console.log('  kraken    - Kraken exchange (most reliable, with volume)');
    console.log('  coingecko - CoinGecko API (free tier available, limited volume)');
    console.log('  yahoo     - Yahoo Finance (free, good history)');
    console.log('  fng       - Fear & Greed Index (Alternative.me) — dates ignored, fetches all');
    console.log('  dominance - BTC Dominance proxy (Yahoo Finance) — dates ignored, fetches all');
    console.log('\nExamples:');
    console.log('  node scripts/fetch-historical-data.js kraken 2013-01-01 2024-12-31 ./data/btc_historical.csv');
    console.log('  node scripts/fetch-historical-data.js yahoo 2020-01-01 2024-12-31 ./data/btc_yahoo.csv BTC-USD');
    console.log('  node scripts/fetch-historical-data.js fng 2020-01-01 2024-12-31 ./data/fear_greed.csv');
    process.exit(1);
  }

  const [source, startDate, endDate, outputPath = './data/btc_historical.csv', symbol] = args;

  const SOURCES = {
    kraken:    (s, e, o, sym) => fetchKrakenHistoricalData(s, e, o),
    coingecko: (s, e, o, sym) => fetchCoinGeckoHistoricalData(s, e, o),
    yahoo:     (s, e, o, sym) => fetchYahooHistoricalData(s, e, o, sym),
    fng:       (s, e, o, sym) => { warnIgnoredDates('fng'); return fetchFearGreedData(o); },
    dominance: (s, e, o, sym) => { warnIgnoredDates('dominance'); return fetchBtcDominanceData(o); }
  };

  const fetchFn = SOURCES[source];

  if (!fetchFn) {
    console.error(`❌ Unknown source: "${source}"`);
    console.error(`   Valid sources: ${Object.keys(SOURCES).join(', ')}`);
    process.exit(1);
  }

  if (symbol && !['yahoo'].includes(source)) {
    console.warn(`⚠️  Symbol argument "${symbol}" is only used by the yahoo source and will be ignored for "${source}".`);
  }

  fetchFn(startDate, endDate, outputPath, symbol)
    .then(count => {
      console.log(`\n✅ Complete! Downloaded ${count} days of data.`);
      console.log(`\nRun backtest with: node tests/backtest.js ${outputPath}`);
    })
    .catch(err => {
      console.error('\n❌ Failed:', err.message);
      process.exit(1);
    });
}

module.exports = {
  fetchKrakenHistoricalData,
  fetchCoinGeckoHistoricalData,
  fetchYahooHistoricalData,
  fetchFearGreedData,
  fetchBtcDominanceData
};