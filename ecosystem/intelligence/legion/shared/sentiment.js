const https = require('https');

// Fear & Greed Index API (alternative.me)
const FG_API_URL = 'https://api.alternative.me/fng/';
let sentimentCache = {
  value: null,
  classification: null,
  timestamp: null,
  lastUpdate: 0
};

// Sentiment thresholds
const SENTIMENT_LEVELS = {
  'Extreme Fear': { min: 0, max: 24, emoji: '😱', action: 'oversold' },
  'Fear': { min: 25, max: 44, emoji: '😨', action: 'cautious' },
  'Neutral': { min: 45, max: 55, emoji: '😐', action: 'neutral' },
  'Greed': { min: 56, max: 74, emoji: '😊', action: 'optimistic' },
  'Extreme Greed': { min: 75, max: 100, emoji: '🚀', action: 'overbought' }
};

async function fetchFearAndGreed() {
  return new Promise((resolve, reject) => {
    const url = `${FG_API_URL}?limit=1&format=json`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const entry = json.data[0];
          const value = parseInt(entry.value);
          const classification = entry.value_classification;
          
          sentimentCache = {
            value,
            classification,
            timestamp: new Date().toISOString(),
            lastUpdate: Date.now()
          };
          
          console.log(`[SENTIMENT] Fear & Greed: ${value} (${classification})`);
          resolve(sentimentCache);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function getSentiment() {
  return sentimentCache;
}

function getSentimentAction(value) {
  for (const [level, data] of Object.entries(SENTIMENT_LEVELS)) {
    if (value >= data.min && value <= data.max) {
      return { level, emoji: data.emoji, action: data.action };
    }
  }
  return { level: 'Unknown', emoji: '❓', action: 'unknown' };
}

function getSentimentRegime(value) {
  if (value >= 75) return 'extreme_greed';
  if (value >= 56) return 'greed';
  if (value >= 45) return 'neutral';
  if (value >= 25) return 'fear';
  return 'extreme_fear';
}

async function refreshSentiment() {
  try {
    await fetchFearAndGreed();
    return sentimentCache;
  } catch (err) {
    console.error('[SENTIMENT] Failed to fetch:', err.message);
    return sentimentCache;
  }
}

// Refresh every hour
if (require.main === module) {
  refreshSentiment();
  setInterval(refreshSentiment, 60 * 60 * 1000);
}

module.exports = { 
  fetchFearAndGreed, 
  getSentiment, 
  getSentimentAction, 
  getSentimentRegime,
  refreshSentiment,
  SENTIMENT_LEVELS
};
