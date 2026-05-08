const { getCurrentPrice, getCandles } = require('../shared/kraken_adapter');

class RLTrader {
  constructor() {
    this.state = {
      balance: 10000,
      position: 0,
      trades: [],
      pnl: 0
    };
  }

  async trade(candles) {
    const currentPrice = await getCurrentPrice('BTC/USD');
    // Simple strategy: buy when RSI < 30, sell when > 70
    const closes = candles.slice(-20).map(c => c.close);
    const rsi = this.calculateRSI(closes);
    
    let action = 'HOLD';
    if (rsi < 30 && this.state.position === 0) {
      action = 'BUY';
      const positionSize = this.state.balance * 0.1;
      this.state.position = positionSize / currentPrice;
      this.state.entryPrice = currentPrice;
      this.state.balance -= positionSize;
      console.log(`[RL] BOUGHT at $${currentPrice.toFixed(2)} | Size: ${this.state.position.toFixed(4)} BTC`);
    } 
    else if (rsi > 70 && this.state.position > 0) {
      action = 'SELL';
      const pnl = (currentPrice - this.state.entryPrice) / this.state.entryPrice;
      this.state.pnl += pnl;
      this.state.balance += this.state.position * currentPrice;
      this.state.position = 0;
      console.log(`[RL] SOLD at $${currentPrice.toFixed(2)} | PnL: ${(pnl*100).toFixed(2)}%`);
    }
    
    return { action, price: currentPrice, pnl: this.state.pnl, balance: this.state.balance };
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      if (change >= 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  getStats() {
    return {
      balance: this.state.balance,
      position: this.state.position,
      pnl: this.state.pnl,
      trades: this.state.trades.length
    };
  }
}

module.exports = { RLTrader };
