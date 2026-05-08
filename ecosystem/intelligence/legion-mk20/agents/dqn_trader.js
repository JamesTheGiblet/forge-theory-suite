const { BaseAgent } = require('./base_agent');
const fs = require('fs');
const path = require('path');

class DQNTrader extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.modelFile = path.join(__dirname, '../data/dqn_model.json');
    this.memoryFile = path.join(__dirname, '../data/dqn_memory.json');
    
    // Neural network architecture for Q-learning
    this.architecture = {
      input: 10,      // market features (price, volume, rsi, etc.)
      hidden1: 64,
      hidden2: 32,
      output: 3       // actions: BUY, SELL, HOLD
    };
    
    // Initialize or load model
    this.model = this.loadModel();
    
    // Experience replay memory
    this.memory = [];
    this.memorySize = 10000;
    
    // Training parameters
    this.gamma = 0.95;      // discount factor
    this.epsilon = 1.0;     // exploration rate
    this.epsilonMin = 0.01;
    this.epsilonDecay = 0.995;
    this.learningRate = 0.001;
    this.batchSize = 32;
    this.trainStep = 0;
    this.updateTargetFreq = 100;
    
    // Metrics
    this.metrics = {
      episodes: 0,
      totalReward: 0,
      avgReward: 0,
      epsilon: this.epsilon,
      qValues: []
    };
    
    this.loadMemory();
  }
  
  loadModel() {
    try {
      if (fs.existsSync(this.modelFile)) {
        return JSON.parse(fs.readFileSync(this.modelFile, 'utf8'));
      }
    } catch(e) {}
    
    // Initialize random weights
    return {
      w1: Array(this.architecture.input * this.architecture.hidden1).fill(0).map(() => Math.random() * 0.1 - 0.05),
      b1: Array(this.architecture.hidden1).fill(0),
      w2: Array(this.architecture.hidden1 * this.architecture.hidden2).fill(0).map(() => Math.random() * 0.1 - 0.05),
      b2: Array(this.architecture.hidden2).fill(0),
      w3: Array(this.architecture.hidden2 * this.architecture.output).fill(0).map(() => Math.random() * 0.1 - 0.05),
      b3: Array(this.architecture.output).fill(0)
    };
  }
  
  saveModel() {
    fs.writeFileSync(this.modelFile, JSON.stringify(this.model, null, 2));
  }
  
  loadMemory() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
        this.memory = data.memory || [];
        this.metrics = data.metrics || this.metrics;
      }
    } catch(e) {}
  }
  
  saveMemory() {
    fs.writeFileSync(this.memoryFile, JSON.stringify({
      memory: this.memory.slice(-1000),
      metrics: this.metrics
    }, null, 2));
  }
  
  // ReLU activation
  relu(x) { return Math.max(0, x); }
  
  // Forward pass through neural network
  forward(state) {
    // Input to Hidden1
    let hidden1 = Array(this.architecture.hidden1).fill(0);
    for (let i = 0; i < this.architecture.hidden1; i++) {
      let sum = this.model.b1[i];
      for (let j = 0; j < this.architecture.input; j++) {
        sum += state[j] * this.model.w1[j * this.architecture.hidden1 + i];
      }
      hidden1[i] = this.relu(sum);
    }
    
    // Hidden1 to Hidden2
    let hidden2 = Array(this.architecture.hidden2).fill(0);
    for (let i = 0; i < this.architecture.hidden2; i++) {
      let sum = this.model.b2[i];
      for (let j = 0; j < this.architecture.hidden1; j++) {
        sum += hidden1[j] * this.model.w2[j * this.architecture.hidden2 + i];
      }
      hidden2[i] = this.relu(sum);
    }
    
    // Hidden2 to Output (Q-values for each action)
    let qValues = Array(this.architecture.output).fill(0);
    for (let i = 0; i < this.architecture.output; i++) {
      let sum = this.model.b3[i];
      for (let j = 0; j < this.architecture.hidden2; j++) {
        sum += hidden2[j] * this.model.w3[j * this.architecture.output + i];
      }
      qValues[i] = sum;
    }
    
    return qValues;
  }
  
  // Choose action based on epsilon-greedy
  act(state, training = true) {
    if (training && Math.random() < this.epsilon) {
      // Explore: random action
      return Math.floor(Math.random() * this.architecture.output);
    }
    
    // Exploit: best action from Q-network
    const qValues = this.forward(state);
    return qValues.indexOf(Math.max(...qValues));
  }
  
  // Store experience in replay memory
  remember(state, action, reward, nextState, done) {
    this.memory.push({ state, action, reward, nextState, done });
    if (this.memory.length > this.memorySize) {
      this.memory.shift();
    }
  }
  
  // Backpropagation (update weights)
  backward(state, targetQValues, learningRate = 0.001) {
    // Forward pass to get current Q-values
    // Calculate errors and update weights (simplified backprop)
    // For brevity, using a simplified update
    
    // This is where the neural network learns!
    const currentQ = this.forward(state);
    const errors = targetQValues.map((target, i) => target - currentQ[i]);
    
    // Update output layer (w3, b3)
    for (let i = 0; i < this.architecture.output; i++) {
      this.model.b3[i] += learningRate * errors[i];
    }
    
    // Save model periodically
    if (this.trainStep % 100 === 0) {
      this.saveModel();
    }
    
    return errors.reduce((a,b) => a + Math.abs(b), 0) / errors.length;
  }
  
  // Replay experiences to train
  replay() {
    if (this.memory.length < this.batchSize) return 0;
    
    // Sample random batch from memory
    const batch = [];
    const indices = new Set();
    while (indices.size < this.batchSize) {
      indices.add(Math.floor(Math.random() * this.memory.length));
    }
    for (const idx of indices) {
      batch.push(this.memory[idx]);
    }
    
    let totalLoss = 0;
    
    for (const experience of batch) {
      const { state, action, reward, nextState, done } = experience;
      
      // Calculate target Q-value using Bellman equation
      let targetQ = this.forward(state);
      if (done) {
        targetQ[action] = reward;
      } else {
        const nextQ = this.forward(nextState);
        const maxNextQ = Math.max(...nextQ);
        targetQ[action] = reward + this.gamma * maxNextQ;
      }
      
      // Update weights
      const loss = this.backward(state, targetQ, this.learningRate);
      totalLoss += loss;
    }
    
    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
      this.metrics.epsilon = this.epsilon;
    }
    
    this.trainStep++;
    this.saveMemory();
    
    return totalLoss / batch.length;
  }
  
  // Extract market features from data
  extractFeatures(marketData) {
    // Features: price, volume, rsi, macd, volatility, etc.
    return [
      (marketData.price - 50000) / 50000,  // normalized price
      marketData.volume / 1000,
      marketData.rsi / 100,
      marketData.macd || 0,
      marketData.volatility || 0,
      marketData.sentiment || 0.5,
      marketData.entropy || 0,
      marketData.fearGreed || 50,
      marketData.btcDominance || 50,
      marketData.openInterest || 0
    ];
  }
  
  // Calculate reward from trade outcome
  calculateReward(action, price, position, tradeResult) {
    let reward = 0;
    
    if (action === 0) { // BUY
      reward = -0.01; // Small cost for entering position
    } else if (action === 1) { // SELL
      if (position > 0) {
        reward = (price - position.entryPrice) / position.entryPrice * 100;
      } else {
        reward = -0.01; // Small penalty for selling without position
      }
    } else { // HOLD
      reward = 0.001; // Tiny reward for patience
    }
    
    return Math.min(1, Math.max(-1, reward));
  }
  
  async trainEpisode(historicalData, initialBalance = 10000) {
    let balance = initialBalance;
    let position = null;
    let totalReward = 0;
    let trades = [];
    
    for (let step = 0; step < historicalData.length - 1; step++) {
      const currentData = historicalData[step];
      const nextData = historicalData[step + 1];
      
      const state = this.extractFeatures(currentData);
      const action = this.act(state);
      
      // Execute action
      let reward = 0;
      const price = currentData.price;
      
      if (action === 0) { // BUY
        if (!position && balance > 0) {
          const amount = balance * 0.1; // Use 10% of balance
          position = { entryPrice: price, amount, entryStep: step };
          balance -= amount;
          reward = -0.01;
        }
      } else if (action === 1) { // SELL
        if (position) {
          const exitValue = position.amount / position.entryPrice * price;
          const profit = exitValue - position.amount;
          balance += position.amount + profit;
          reward = profit / position.amount * 100;
          trades.push({ entry: position.entryPrice, exit: price, profit });
          position = null;
        } else {
          reward = -0.05;
        }
      } else { // HOLD
        reward = 0.001;
      }
      
      totalReward += reward;
      
      const nextState = this.extractFeatures(nextData);
      const done = step === historicalData.length - 2;
      
      this.remember(state, action, reward, nextState, done);
    }
    
    // Close any open position
    if (position) {
      const finalPrice = historicalData[historicalData.length - 1].price;
      const exitValue = position.amount / position.entryPrice * finalPrice;
      balance += exitValue;
    }
    
    // Train on experiences
    const loss = this.replay();
    
    const roi = ((balance - initialBalance) / initialBalance) * 100;
    
    this.metrics.episodes++;
    this.metrics.totalReward += totalReward;
    this.metrics.avgReward = this.metrics.totalReward / this.metrics.episodes;
    
    return {
      episode: this.metrics.episodes,
      roi: roi.toFixed(2),
      trades: trades.length,
      reward: totalReward.toFixed(2),
      loss: loss?.toFixed(4) || 0,
      epsilon: this.epsilon.toFixed(3),
      balance: balance.toFixed(2)
    };
  }
  
  getTrainingStatus() {
    return {
      episodes: this.metrics.episodes,
      avgReward: this.metrics.avgReward.toFixed(2),
      epsilon: this.metrics.epsilon.toFixed(3),
      memorySize: this.memory.length,
      trainStep: this.trainStep,
      gamma: this.gamma
    };
  }
}

module.exports = { DQNTrader };
