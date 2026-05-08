const https = require('https');

// Alternative Crypto Fear & Greed API (no API key required)
// Using Alternative.me API - free, no key needed
class FearGreedIndex {
  constructor() {
    this.current = null;
    this.history = [];
    this.lastUpdate = null;
  }

  async fetch() {
    return new Promise((resolve, reject) => {
      const url = 'https://api.alternative.me/fng/?limit=10';
      
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.data && json.data[0]) {
              const latest = json.data[0];
              this.current = {
                value: parseInt(latest.value),
                classification: latest.value_classification,
                timestamp: latest.timestamp,
                time_until_update: latest.time_until_update
              };
              
              // Store history
              this.history = json.data.map(item => ({
                value: parseInt(item.value),
                classification: item.value_classification,
                timestamp: item.timestamp
              }));
              
              this.lastUpdate = new Date().toISOString();
              resolve(this.current);
            } else {
              reject(new Error('Invalid response from API'));
            }
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', reject);
    });
  }

  getClassification(value) {
    if (value <= 25) return 'EXTREME_FEAR';
    if (value <= 45) return 'FEAR';
    if (value <= 55) return 'NEUTRAL';
    if (value <= 75) return 'GREED';
    return 'EXTREME_GREED';
  }

  isExtremeFear() {
    return this.current && this.current.value <= 25;
  }

  isExtremeGreed() {
    return this.current && this.current.value >= 75;
  }

  isFear() {
    return this.current && this.current.value <= 45;
  }

  isGreed() {
    return this.current && this.current.value >= 55;
  }

  getSpillwaySignal() {
    // Spillway triggers when greed > 75
    return this.current && this.current.value >= 75;
  }

  getExtractionSignal() {
    // Extraction triggers when extreme fear hits suddenly
    return this.current && this.current.value <= 20;
  }
}

module.exports = { FearGreedIndex };
