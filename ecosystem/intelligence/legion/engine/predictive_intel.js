const stats = require('simple-statistics');
const { getCandles } = require('../shared/kraken_adapter');
const { sendMessage } = require('../bus/router');

class PredictiveIntel {
  constructor() {
    this.predictions = [];
    this.macroData = { cpi: null, interestRate: null, dollarIndex: null };
  }

  // Linear regression for price prediction
  predictLinearRegression(candles) {
    const closes = candles.slice(-30).map(c => c.close);
    const indices = Array.from({ length: closes.length }, (_, i) => i);
    const regression = stats.linearRegression(indices.map((x, i) => [x, closes[i]]));
    const nextIndex = closes.length;
    const predictedPrice = regression.m * nextIndex + regression.b;
    const lastPrice = closes[closes.length - 1];
    const direction = predictedPrice > lastPrice ? 'up' : 'down';
    const confidence = Math.min(100, Math.abs((predictedPrice - lastPrice) / lastPrice * 100) * 5);
    return { direction, confidence: Math.floor(confidence), predictedPrice };
  }

  async predict() {
    const candles = await getCandles('BTC/USD', 100);
    if (!candles || !Array.isArray(candles) || candles.length < 30) {
      console.log('[PREDICT] Insufficient candle data');
      return null;
    }

    const { direction, confidence, predictedPrice } = this.predictLinearRegression(candles);
    const currentPrice = candles[candles.length-1].close;

    const prediction = {
      direction,
      confidence,
      timestamp: Date.now(),
      price: currentPrice,
      predictedPrice: predictedPrice.toFixed(0)
    };

    this.predictions.push(prediction);
    if (this.predictions.length > 100) this.predictions.shift();

    console.log(`[PREDICT] Next hour: ${direction} (${confidence}% confidence) | Predicted: $${prediction.predictedPrice}`);

    if (confidence > 70) {
      sendMessage('diplomat', 'PRICE_PREDICTION', prediction);
    }

    return prediction;
  }

  start(intervalMinutes = 60) {
    console.log('[PREDICT] Predictive intelligence active (linear regression)');
    this.predict();
    setInterval(() => this.predict(), intervalMinutes * 60 * 1000);
  }
}

module.exports = { PredictiveIntel };
