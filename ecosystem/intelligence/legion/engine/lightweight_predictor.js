class LightweightPredictor {
  constructor() {
    this.isTrained = true;
  }

  predict(candles) {
    const closes = candles.slice(-20).map(c => c.close);
    const avg = closes.reduce((a, b) => a + b, 0) / closes.length;
    const last = closes[closes.length - 1];
    const trend = (last - avg) / avg;
    return last * (1 + trend * 0.5);
  }
}

module.exports = { LightweightPredictor };
