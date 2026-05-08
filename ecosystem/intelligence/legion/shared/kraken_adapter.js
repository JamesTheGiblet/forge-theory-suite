const crypto = require('crypto');
const https = require('https');

const API_KEY = process.env.KRAKEN_API_KEY;
const API_SECRET = process.env.KRAKEN_API_SECRET;
const IS_PAPER = process.env.LIVE_TRADING !== 'true';

// Paper mode balances (only used if LIVE_TRADING=false)
let paperBalances = {
  BTC: 0.0018,
  USD: 522,
  ETH: 0,
  SOL: 0
};

// Public request (no auth required)
function publicRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const urlPath = `/0/${endpoint}`;
    const queryString = new URLSearchParams(params).toString();
    const fullPath = queryString ? `${urlPath}?${queryString}` : urlPath;
    
    const options = {
      hostname: 'api.kraken.com',
      path: fullPath,
      method: 'GET',
      headers: {
        'User-Agent': 'LEGION-Trading-Bot/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error && json.error.length) {
            reject(new Error(json.error.join(', ')));
          } else {
            resolve(json.result);
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Private request (requires API keys)
function privateRequest(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    if (!API_KEY || !API_SECRET) {
      return reject(new Error('KRAKEN_API_KEY and KRAKEN_API_SECRET required for private endpoints'));
    }
    
    const urlPath = `/0/${endpoint}`;
    const postData = new URLSearchParams(data).toString();
    const sha256 = crypto.createHash('sha256');
    sha256.update(postData + urlPath);
    const hash = sha256.digest('binary');
    
    const signature = crypto.createHmac('sha512', Buffer.from(API_SECRET, 'base64'))
      .update(urlPath + hash)
      .digest('base64');
    
    const options = {
      hostname: 'api.kraken.com',
      path: urlPath,
      method: 'POST',
      headers: {
        'API-Key': API_KEY,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error && json.error.length) {
            reject(new Error(json.error.join(', ')));
          } else {
            resolve(json.result);
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getBalance() {
  if (IS_PAPER) {
    console.log('[KRAKEN] Paper mode - returning mock balances');
    return paperBalances;
  }
  
  try {
    const result = await privateRequest('private/Balance');
    const balances = {};
    for (const [asset, amount] of Object.entries(result)) {
      balances[asset] = parseFloat(amount);
    }
    return balances;
  } catch (err) {
    console.error('[KRAKEN] Failed to get balance:', err.message);
    throw err;
  }
}

async function getCurrentPrice(pair) {
  try {
    const result = await publicRequest('public/Ticker', { pair });
    const pairKey = Object.keys(result)[0];
    const price = parseFloat(result[pairKey].c[0]);
    return price;
  } catch (err) {
    console.error('[KRAKEN] Failed to get price for', pair, err.message);
    throw err;
  }
}

async function getCandles(pair, interval = 60, since = null) {
  try {
    const params = { pair, interval };
    if (since) params.since = since;
    
    const result = await publicRequest('public/OHLC', params);
    const candles = result[pair].map(candle => ({
      time: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[6])
    }));
    return candles;
  } catch (err) {
    console.error('[KRAKEN] Failed to get candles:', err.message);
    throw err;
  }
}

function setPaperBalance(asset, amount) {
  if (IS_PAPER) {
    paperBalances[asset] = amount;
  }
}

module.exports = { getCandles, getCurrentPrice, getBalance, setPaperBalance };
