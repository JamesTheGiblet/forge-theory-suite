const { getCurrentPrice } = require('../shared/kraken_adapter');
const { sendMessage } = require('../bus/router');

class ArbitrageEngine {
  constructor() {
    this.correlations = {
      'BTC/ETH': { asset1: 'BTC/USD', asset2: 'ETH/USD', threshold: 0.03, lastAlert: 0 },
      'BTC/SOL': { asset1: 'BTC/USD', asset2: 'SOL/USD', threshold: 0.04, lastAlert: 0 },
      'ETH/SOL': { asset1: 'ETH/USD', asset2: 'SOL/USD', threshold: 0.04, lastAlert: 0 },
      'XRP/LINK': { asset1: 'XRP/USD', asset2: 'LINK/USD', threshold: 0.05, lastAlert: 0 },
      'LTC/DOGE': { asset1: 'LTC/USD', asset2: 'DOGE/USD', threshold: 0.06, lastAlert: 0 }
    };
    this.baselines = new Map();
    this.samples = new Map();
  }

  async updateBaselines() {
    for (const [pair, config] of Object.entries(this.correlations)) {
      const price1 = await getCurrentPrice(config.asset1);
      const price2 = await getCurrentPrice(config.asset2);
      
      if (price1 && price2) {
        const ratio = price1 / price2;
        
        if (!this.baselines.has(pair)) {
          this.baselines.set(pair, ratio);
          this.samples.set(pair, 1);
        } else {
          const current = this.baselines.get(pair);
          const samples = this.samples.get(pair);
          const alpha = 0.05;
          const newRatio = current * (1 - alpha) + ratio * alpha;
          this.baselines.set(pair, newRatio);
          this.samples.set(pair, samples + 1);
        }
      }
    }
  }

  async scan() {
    await this.updateBaselines();
    
    const opportunities = [];
    const now = Date.now();
    
    for (const [pair, config] of Object.entries(this.correlations)) {
      const price1 = await getCurrentPrice(config.asset1);
      const price2 = await getCurrentPrice(config.asset2);
      const baseline = this.baselines.get(pair);
      const samples = this.samples.get(pair) || 0;
      
      if (!price1 || !price2 || !baseline || samples < 20) continue;
      
      const currentRatio = price1 / price2;
      const deviation = (currentRatio - baseline) / baseline;
      
      if (Math.abs(deviation) > config.threshold) {
        const direction = deviation > 0 ? 'overvalued' : 'undervalued';
        const signal = deviation > 0 
          ? `SELL ${config.asset1} / BUY ${config.asset2}`
          : `BUY ${config.asset1} / SELL ${config.asset2}`;
        
        const opportunity = {
          pair,
          deviation: (deviation * 100).toFixed(2),
          direction,
          signal,
          price1,
          price2,
          confidence: Math.min(95, Math.abs(deviation) / config.threshold * 80)
        };
        
        if (now - config.lastAlert > 6 * 60 * 60 * 1000) {
          config.lastAlert = now;
          opportunities.push(opportunity);
          sendMessage('diplomat', 'ARBITRAGE_OPPORTUNITY', opportunity);
          console.log(`[ARBITRAGE] ${pair}: ${opportunity.deviation}% ${direction}`);
        }
      }
    }
    
    return opportunities;
  }

  start(intervalMinutes = 15) {
    console.log('[ARBITRAGE] Cross-asset arbitrage active (every 15 min)');
    this.scan();
    setInterval(() => this.scan(), intervalMinutes * 60 * 1000);
  }
}

module.exports = { ArbitrageEngine };
