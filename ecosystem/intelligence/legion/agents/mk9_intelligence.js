const { LightweightPredictor } = require("../engine/lightweight_predictor");
const { RLTrader } = require('../engine/rl_trader');
const { getCandles, getCurrentPrice } = require('../shared/kraken_adapter');
const { sendMessage } = require('../bus/router');

class MK9Intelligence {
  constructor() {
    this.predictor = new LightweightPredictor();
    this.rlTrader = new RLTrader();
    this.isTraining = false;
    this.predictions = [];
  }

  async initialize() {
    
    // Load or build predictor model
    await this.predictor.load('./models/lstm');
    if (!this.predictor.isTrained) {
      this.predictor.buildModel();
    }
    
  }

  async trainPredictor() {
    const candles = getCandles('BTC/USD', 1000);
    if (candles && candles.length > 200) {
      await this.predictor.train(candles, 30);
      await this.predictor.save('./models/lstm');
    }
  }

  async analyzeMarket() {
    const candles = getCandles('BTC/USD', 100);
    const currentPrice = await getCurrentPrice('BTC/USD');
    const prediction = await this.predictor.predict(candles);
    
    const analysis = {
      currentPrice,
      predictedPrice: prediction,
      direction: prediction > currentPrice ? 'bullish' : 'bearish',
      confidence: Math.abs((prediction - currentPrice) / currentPrice) * 100,
      timestamp: Date.now()
    };
    
    this.predictions.push(analysis);
    if (this.predictions.length > 100) this.predictions.shift();
    
    
    return analysis;
  }

  async executeRLTrade() {
    const candles = getCandles('BTC/USD', 200);
    const result = await this.rlTrader.trade(candles);
    
    // Send alert for significant trades
    if (result.action !== 'HOLD') {
      sendMessage('diplomat', 'RL_TRADE_EXECUTED', {
        action: result.action,
        price: result.price,
        pnl: result.pnl,
        balance: result.balance
      });
    }
    
    return result;
  }

  async start() {
    await this.initialize();
    
    
    // Train predictor periodically
    setInterval(async () => {
      await this.trainPredictor();
    }, 24 * 60 * 60 * 1000); // Daily training
    
    // Analyze market every 15 minutes
    setInterval(async () => {
      const analysis = await this.analyzeMarket();
      
      // Send alert for significant predictions
      if (analysis.confidence > 5) {
        sendMessage('diplomat', 'MARKET_PREDICTION', analysis);
      }
    }, 15 * 60 * 1000);
    
    // Execute RL trades every hour
    setInterval(async () => {
      await this.executeRLTrade();
    }, 60 * 60 * 1000);
  }

  getStats() {
    const lastPrediction = this.predictions[this.predictions.length - 1];
    const rlStats = this.rlTrader.getStats();
    
    return {
      lastPrediction,
      rlStats,
      totalPredictions: this.predictions.length
    };
  }
}

module.exports = { MK9Intelligence };
