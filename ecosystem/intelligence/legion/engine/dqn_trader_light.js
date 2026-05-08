const { getCandles, getCurrentPrice } = require('../shared/kraken_adapter');

// Simple Q-Learning with neural network approximation using pure JS
class DQNTrader {
  constructor() {
    this.qTable = new Map();
    this.memory = [];
    this.batchSize = 32;
    this.gamma = 0.95;
    this.epsilon = 1.0;
    this.epsilonMin = 0.01;
    this.epsilonDecay = 0.995;
    this.learningRate = 0.1;
    this.stateSize = 8;
    this.actionSize = 3;  // Buy, Hold, Sell
    
    this.state = {
      balance: 10000,
      position: 0,
      entryPrice: 0,
      trades: [],
      pnl: 0
    };
    
    console.log('[DQN] Lightweight Q-Learner initialized');
  }

  // Discretize continuous state for Q-table
  discretizeState(state) {
    return state.map(v => Math.floor(v * 10) / 10).join('|');
  }

  getState(candles) {
    if (!candles || candles.length < 30) return null;
    
    const recent = candles.slice(-30);
    const closes = recent.map(c => c.close);
    const volumes = recent.map(c => c.volume);
    
    // Calculate indicators
    const rsi = this.calculateRSI(closes);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const volatility = this.calculateVolatility(closes);
    const volumeRatio = volumes[volumes.length-1] / this.calculateSMA(volumes, 20);
    const priceChange = (closes[closes.length-1] - closes[closes.length-2]) / closes[closes.length-2];
    
    // Normalize features (0-1 range)
    return [
      Math.min(1, rsi / 100),
      Math.min(1, Math.max(0, priceChange * 10 + 0.5)),
      Math.min(1, volatility * 10),
      Math.min(1, volumeRatio / 5),
      Math.min(1, (closes[closes.length-1] - sma20) / sma20 + 0.5),
      Math.min(1, (sma20 - sma50) / sma50 + 0.5),
      this.state.position > 0 ? 1 : 0,
      Math.min(1, this.state.balance / 10000)
    ];
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

  calculateSMA(values, period) {
    if (values.length < period) return values[values.length-1];
    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  calculateVolatility(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  getQValue(state, action) {
    const key = this.discretizeState(state);
    if (!this.qTable.has(key)) {
      this.qTable.set(key, new Array(this.actionSize).fill(0));
    }
    return this.qTable.get(key)[action];
  }

  setQValue(state, action, value) {
    const key = this.discretizeState(state);
    if (!this.qTable.has(key)) {
      this.qTable.set(key, new Array(this.actionSize).fill(0));
    }
    this.qTable.get(key)[action] = value;
  }

  chooseAction(state) {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.actionSize);
    }
    
    const qValues = [];
    for (let a = 0; a < this.actionSize; a++) {
      qValues.push(this.getQValue(state, a));
    }
    return qValues.indexOf(Math.max(...qValues));
  }

  async executeAction(action, price) {
    let reward = 0;
    const actions = ['BUY', 'HOLD', 'SELL'];
    
    if (action === 0 && this.state.position === 0) { // BUY
      const positionSize = this.state.balance * 0.1;
      this.state.position = positionSize / price;
      this.state.entryPrice = price;
      this.state.balance -= positionSize;
      reward = -0.005;
      console.log(`[DQN] BUY at $${price.toFixed(2)} | Size: ${this.state.position.toFixed(4)} BTC`);
    } 
    else if (action === 2 && this.state.position > 0) { // SELL
      const pnl = (price - this.state.entryPrice) / this.state.entryPrice;
      this.state.pnl += pnl;
      this.state.balance += this.state.position * price;
      this.state.trades.push({ pnl, timestamp: Date.now() });
      this.state.position = 0;
      reward = pnl * 100;
      console.log(`[DQN] SELL at $${price.toFixed(2)} | PnL: ${(pnl*100).toFixed(2)}%`);
    }
    else {
      reward = 0;
    }
    
    if (this.state.pnl > 0) reward += this.state.pnl * 10;
    
    return { reward, actionName: actions[action] };
  }

  updateQValue(state, action, reward, nextState) {
    const currentQ = this.getQValue(state, action);
    const maxNextQ = Math.max(...[0,1,2].map(a => this.getQValue(nextState, a)));
    const newQ = currentQ + this.learningRate * (reward + this.gamma * maxNextQ - currentQ);
    this.setQValue(state, action, newQ);
  }

  async trade(candles) {
    const state = this.getState(candles);
    if (!state) return null;
    
    const currentPrice = await getCurrentPrice('BTC/USD');
    const action = this.chooseAction(state);
    const { reward, actionName } = await this.executeAction(action, currentPrice);
    
    const nextState = this.getState(candles.slice(-30));
    if (nextState) {
      this.updateQValue(state, action, reward, nextState);
    }
    
    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }
    
    return {
      action: actionName,
      price: currentPrice,
      pnl: this.state.pnl,
      balance: this.state.balance,
      epsilon: this.epsilon.toFixed(3),
      trades: this.state.trades.length,
      qTableSize: this.qTable.size
    };
  }

  getStats() {
    const wins = this.state.trades.filter(t => t.pnl > 0).length;
    const losses = this.state.trades.filter(t => t.pnl <= 0).length;
    const totalPnl = this.state.trades.reduce((sum, t) => sum + t.pnl, 0);
    
    return {
      balance: this.state.balance,
      position: this.state.position,
      pnl: totalPnl,
      winRate: this.state.trades.length > 0 ? (wins / this.state.trades.length * 100).toFixed(1) : 0,
      trades: this.state.trades.length,
      wins,
      losses,
      epsilon: this.epsilon.toFixed(3),
      qTableSize: this.qTable.size
    };
  }
}

module.exports = { DQNTrader };
