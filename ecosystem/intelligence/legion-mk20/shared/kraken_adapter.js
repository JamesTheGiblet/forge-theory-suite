const https = require('https');

// Kraken pair name mappings (verified working)
const pairMap = {
  'BTC/USD': 'XXBTZUSD',
  'XBT/USD': 'XXBTZUSD',
  'ETH/USD': 'XETHZUSD',
  'BTC/ETH': 'XXBTZETH',
  'XBT/ETH': 'XXBTZETH',
  'SOL/USD': 'SOLUSD',
  'XRP/USD': 'XXRPZUSD',
  'LINK/USD': 'LINKUSD'
};

async function getCurrentPrice(pair) {
  const krakenPair = pairMap[pair] || pair;
  
  return new Promise((resolve) => {
    const url = `https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error && json.error.length && json.error[0] !== '') {
            resolve(null);
          } else if (json.result) {
            const pairKey = Object.keys(json.result)[0];
            const price = parseFloat(json.result[pairKey].c[0]);
            resolve(price);
          } else {
            resolve(null);
          }
        } catch (err) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function getCandles(pair, interval = 60) {
  const krakenPair = pairMap[pair] || pair;
  
  return new Promise((resolve) => {
    const url = `https://api.kraken.com/0/public/OHLC?pair=${krakenPair}&interval=${interval}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error && json.error.length) {
            resolve([]);
          } else if (json.result) {
            const pairKey = Object.keys(json.result)[0];
            const candles = (json.result[pairKey] || []).map(candle => ({
              time: candle[0],
              open: parseFloat(candle[1]),
              high: parseFloat(candle[2]),
              low: parseFloat(candle[3]),
              close: parseFloat(candle[4]),
              volume: parseFloat(candle[6])
            }));
            resolve(candles);
          } else {
            resolve([]);
          }
        } catch (err) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

module.exports = { getCurrentPrice, getCandles, pairMap };
