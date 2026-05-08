const { BaseAgent } = require('./base_agent');
const { getCurrentPrice } = require('../shared/kraken_adapter.js');

class ArbitrageHunter extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.pairs = this.pairs || ['ETH/USD', 'SOL/USD', 'XRP/USD', 'LINK/USD'];
    this.minProfit = this.min_profit_percent || 0.5;
    this.opportunities = [];
    this.scanInterval = null;
  }
  
  async start() {
    await super.start();
    this.log(`Arbitrage Hunter active on ${this.exchange || 'kraken'}`);
    this.log(`Watching pairs: ${this.pairs.join(', ')}`);
    this.startScanning();
    return true;
  }
  
  startScanning() {
    this.scanInterval = setInterval(() => this.scan(), this.scan_interval_ms || 10000);
    setTimeout(() => this.scan(), 2000);
  }
  
  async scan() {
    try {
      const prices = {};
      for (const pair of this.pairs) {
        const price = await getCurrentPrice(pair);
        if (price) prices[pair] = price;
      }
      
      // Check for direct spreads
      for (const pair of this.pairs) {
        if (prices[pair]) {
          const simulatedSpread = Math.random() * 0.3; // Simulate spread
          if (simulatedSpread > this.minProfit) {
            const opportunity = {
              type: 'direct',
              pair,
              profitPercent: simulatedSpread,
              profitUsd: (simulatedSpread / 100) * (this.max_position_usd || 1000),
              timestamp: Date.now(),
              description: `${pair} spread: ${simulatedSpread.toFixed(2)}%`
            };
            this.opportunities.unshift(opportunity);
            if (this.opportunities.length > 100) this.opportunities.pop();
            this.log(`🎯 Arbitrage opportunity: ${opportunity.description}`);
            
            // Report to API
            this.reportOpportunity(opportunity);
          }
        }
      }
    } catch (err) {
      // Silent fail
    }
  }
  
  async reportOpportunity(opportunity) {
    try {
      const http = require('http');
      const data = JSON.stringify(opportunity);
      const options = {
        hostname: 'localhost',
        port: 3011,
        path: '/api/arbitrage/opportunity',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
      };
      const req = http.request(options, (res) => { res.resume(); });
      req.on('error', () => {});
      req.write(data);
      req.end();
    } catch(e) {}
  }
  
  async stop() {
    if (this.scanInterval) clearInterval(this.scanInterval);
    await super.stop();
  }
}

module.exports = { ArbitrageHunter };
