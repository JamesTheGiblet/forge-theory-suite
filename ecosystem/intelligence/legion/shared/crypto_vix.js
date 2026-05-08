const { getCandles } = require('./kraken_adapter');

// Calculate Crypto VIX - Volatility Index
class CryptoVIX {
  constructor() {
    this.history = new Map(); // asset -> historical vix values
  }

  calculateVolatility(prices, period = 20) {
    if (prices.length < period) return null;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const recentReturns = returns.slice(-period);
    const mean = recentReturns.reduce((a, b) => a + b, 0) / period;
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    // Annualized volatility (sqrt(365 * 24) for hourly candles)
    const annualized = stdDev * Math.sqrt(365 * 24);
    
    return annualized * 100; // VIX scale (0-100+)
  }

  calculateVIX(asset, candles) {
    if (!candles || candles.length < 20) return null;
    
    const prices = candles.map(c => c.close);
    const volatility = this.calculateVolatility(prices, 20);
    
    // Store history
    if (!this.history.has(asset)) {
      this.history.set(asset, []);
    }
    const hist = this.history.get(asset);
    hist.push({ timestamp: Date.now(), vix: volatility });
    if (hist.length > 100) hist.shift();
    
    return volatility;
  }

  getVIXLevel(vix) {
    if (vix === null) return { level: 'unknown', emoji: '❓', interpretation: 'Insufficient data' };
    if (vix < 20) return { level: 'low', emoji: '🟢', interpretation: 'Low volatility, trending market' };
    if (vix < 40) return { level: 'medium', emoji: '🟡', interpretation: 'Normal volatility' };
    if (vix < 60) return { level: 'high', emoji: '🟠', interpretation: 'High volatility, caution' };
    return { level: 'extreme', emoji: '🔴', interpretation: 'Extreme volatility, high risk' };
  }

  async getAssetVIX(asset) {
    const candles = getCandles(asset, 50);
    const vix = this.calculateVIX(asset, candles);
    const level = this.getVIXLevel(vix);
    return { asset, vix: vix ? vix.toFixed(1) : null, ...level };
  }

  async getAllVIX() {
    const assets = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'LINK/USD', 'LTC/USD', 'DOGE/USD'];
    const results = [];
    for (const asset of assets) {
      const vixData = await this.getAssetVIX(asset);
      results.push(vixData);
    }
    return results;
  }
}

module.exports = { CryptoVIX };
