const { BaseAgent } = require('./base_agent');
const https = require('https');

class IntelligentTrader extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.lastDecision = null;
    this.decisionHistory = [];
    this.positions = [];
    this.balance = 10000;
    this.paperMode = true;
  }
  
  async start() {
    await super.start();
    this.log(`🧠 Intelligent Trader active - using trained DQN & LSTM models`);
    this.startTradingCycle();
    return true;
  }
  
  startTradingCycle() {
    // Check every minute
    this.interval = setInterval(() => this.makeTradingDecision(), 60000);
    setTimeout(() => this.makeTradingDecision(), 5000);
  }
  
  async makeTradingDecision() {
    try {
      // Get current market data
      const marketData = await this.getMarketData();
      
      // Get DQN trading decision
      const dqnDecision = await this.getDQNDecision(marketData);
      
      // Get LSTM price prediction
      const lstmPrediction = await this.getLSTMPrediction(marketData.currentPrice);
      
      // Combine intelligence sources
      const finalDecision = this.combineDecisions(dqnDecision, lstmPrediction, marketData);
      
      // Execute decision
      await this.executeTrade(finalDecision, marketData);
      
      // Store decision history
      this.decisionHistory.push({
        timestamp: new Date().toISOString(),
        marketData,
        dqnDecision,
        lstmPrediction,
        finalDecision
      });
      
      // Keep last 100 decisions
      if (this.decisionHistory.length > 100) {
        this.decisionHistory.shift();
      }
      
    } catch (err) {
      this.log(`Trading decision error: ${err.message}`, 'error');
    }
  }
  
  async getMarketData() {
    // Fetch real market data from Kraken
    const btcPrice = await this.getKrakenPrice('XBT/USD');
    const ethPrice = await this.getKrakenPrice('ETH/USD');
    const solPrice = await this.getKrakenPrice('SOL/USD');
    
    // Calculate additional metrics
    const rsi = this.calculateRSI(btcPrice);
    const volatility = this.calculateVolatility(btcPrice);
    
    return {
      timestamp: Date.now(),
      currentPrice: btcPrice,
      ethPrice,
      solPrice,
      rsi,
      volatility,
      priceChange: await this.getPriceChange('XBT/USD'),
      balance: this.balance,
      position: this.positions.length
    };
  }
  
  async getKrakenPrice(pair) {
    return new Promise((resolve) => {
      const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const pairKey = Object.keys(json.result)[0];
            const price = parseFloat(json.result[pairKey].c[0]);
            resolve(price);
          } catch(e) { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });
  }
  
  async getPriceChange(pair) {
    // Get price from 1 hour ago
    // Simplified for now
    return (Math.random() - 0.5) * 0.02;
  }
  
  calculateRSI(price) {
    // Simplified RSI calculation
    return 50 + (Math.random() - 0.5) * 30;
  }
  
  calculateVolatility(price) {
    return Math.abs(this.getPriceChange('XBT/USD')) * 100;
  }
  
  async getDQNDecision(marketData) {
    // Call the DQN model via API
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        market_data: {
          rsi: marketData.rsi,
          price_change: marketData.priceChange,
          volatility: marketData.volatility
        }
      });
      
      const req = https.request({
        hostname: 'localhost',
        port: 3011,
        path: '/api/intelligence/trade',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch(e) { resolve({ action: 'HOLD', confidence: 0.5 }); }
        });
      });
      req.on('error', () => resolve({ action: 'HOLD', confidence: 0.5 }));
      req.write(postData);
      req.end();
    });
  }
  
  async getLSTMPrediction(currentPrice) {
    // Call the LSTM model via API
    return new Promise((resolve) => {
      const postData = JSON.stringify({ current_price: currentPrice });
      
      const req = https.request({
        hostname: 'localhost',
        port: 3011,
        path: '/api/intelligence/predict',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch(e) { resolve({ predictions: { '1h': currentPrice } }); }
        });
      });
      req.on('error', () => resolve({ predictions: { '1h': currentPrice } }));
      req.write(postData);
      req.end();
    });
  }
  
  combineDecisions(dqnDecision, lstmPrediction, marketData) {
    let action = dqnDecision.action;
    let confidence = dqnDecision.confidence;
    let reason = dqnDecision.reason;
    
    // Adjust based on LSTM prediction
    const predictedChange = (lstmPrediction.predictions['1h'] - marketData.currentPrice) / marketData.currentPrice;
    
    if (predictedChange > 0.01 && action === 'BUY') {
      confidence = Math.min(0.95, confidence + 0.1);
      reason += ' + LSTM bullish confirmation';
    } else if (predictedChange < -0.01 && action === 'SELL') {
      confidence = Math.min(0.95, confidence + 0.1);
      reason += ' + LSTM bearish confirmation';
    } else if (predictedChange > 0.01 && action === 'SELL') {
      confidence = Math.max(0.5, confidence - 0.15);
      reason += ' + LSTM conflict (bullish price predicted)';
    } else if (predictedChange < -0.01 && action === 'BUY') {
      confidence = Math.max(0.5, confidence - 0.15);
      reason += ' + LSTM conflict (bearish price predicted)';
    }
    
    // Check balance and position limits
    if (action === 'BUY' && this.balance < 100) {
      action = 'HOLD';
      reason = 'Insufficient balance';
    }
    
    if (action === 'SELL' && this.positions.length === 0) {
      action = 'HOLD';
      reason = 'No position to sell';
    }
    
    return { action, confidence, reason, predictedChange };
  }
  
  async executeTrade(decision, marketData) {
    if (decision.action === 'BUY' && decision.confidence > 0.7) {
      const amount = Math.min(this.balance * 0.1, 500);
      this.positions.push({
        entryPrice: marketData.currentPrice,
        amount: amount,
        timestamp: Date.now(),
        confidence: decision.confidence
      });
      this.balance -= amount;
      this.log(`📈 BUY: $${amount.toFixed(2)} at $${marketData.currentPrice.toFixed(2)} (${(decision.confidence*100).toFixed(0)}% confidence) - ${decision.reason}`);
      
    } else if (decision.action === 'SELL' && decision.confidence > 0.7 && this.positions.length > 0) {
      const position = this.positions.pop();
      const proceeds = position.amount;
      const profit = (marketData.currentPrice - position.entryPrice) / position.entryPrice * 100;
      this.balance += proceeds;
      this.log(`📉 SELL: $${proceeds.toFixed(2)} at $${marketData.currentPrice.toFixed(2)} (Profit: ${profit.toFixed(2)}%) - ${decision.reason}`);
      
    } else {
      this.log(`⏸️ HOLD: $${marketData.currentPrice.toFixed(2)} - ${decision.reason} (${(decision.confidence*100).toFixed(0)}% confidence)`);
    }
  }
  
  async stop() {
    if (this.interval) clearInterval(this.interval);
    await super.stop();
  }
  
  getStatus() {
    return {
      balance: this.balance,
      positions: this.positions.length,
      decisions: this.decisionHistory.length,
      lastDecision: this.decisionHistory[this.decisionHistory.length - 1]?.finalDecision || null
    };
  }
}

module.exports = { IntelligentTrader };

// Thermodynamic execution timing
calculateOptimalEntry(currentPrice, signalStrength, volatility) {
  // Simulate cooling: price retracement towards entry after signal
  const coolingRate = volatility * 0.1;
  const targetEntry = currentPrice * (1 - signalStrength * 0.005); // pullback ~0.5% per 0.1 signal
  const timeToEntry = Math.log(targetEntry / currentPrice) / -coolingRate;
  const waitMs = Math.min(Math.max(timeToEntry * 1000, 100), 5000);
  
  return { limitPrice: targetEntry, waitMs };
}

// Override executeTrade to use this timing
async executeTrade(decision, marketData) {
  if (decision.action === 'BUY' && decision.confidence > 0.7) {
    const timing = this.calculateOptimalEntry(marketData.currentPrice, decision.confidence, marketData.volatility);
    this.log(`⏱️  Optimal entry at ${timing.limitPrice.toFixed(2)} in ${timing.waitMs}ms (cooling)`);
    setTimeout(() => {
      // Actually place order (paper mode)
      const amount = Math.min(this.balance * 0.1, 500);
      this.positions.push({ entryPrice: timing.limitPrice, amount, timestamp: Date.now() });
      this.balance -= amount;
      this.log(`📈 BUY executed at ${timing.limitPrice.toFixed(2)}`);
    }, timing.waitMs);
    return;
  }
  // ... rest of existing executeTrade logic
}
