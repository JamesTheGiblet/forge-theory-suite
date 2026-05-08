const { BaseAgent } = require('./base_agent');
const fs = require('fs');
const path = require('path');

class ChameleonRL extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.memoryFile = path.join(__dirname, '../data/chameleon_rl_memory.json');
    this.modelFile = path.join(__dirname, '../data/chameleon_model.json');
    
    // Neural network weights (simplified for RL)
    this.weights = {
      input: 64,      // input layer size
      hidden1: 128,   // first hidden layer
      hidden2: 64,    // second hidden layer
      output: 32      // output layer
    };
    
    // Initialize or load weights
    this.model = this.loadModel();
    
    // Training metrics
    this.metrics = {
      totalInteractions: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
      accuracy: 0.5,
      loss: 0.5,
      epsilon: 0.3  // exploration rate
    };
    
    this.knowledgeBase = [];
    this.loadMemory();
  }
  
  loadModel() {
    try {
      if (fs.existsSync(this.modelFile)) {
        return JSON.parse(fs.readFileSync(this.modelFile, 'utf8'));
      }
    } catch(e) {}
    
    // Initialize random weights
    const weights = {
      w1: Array(64 * 128).fill(0).map(() => Math.random() * 0.1 - 0.05),
      b1: Array(128).fill(0),
      w2: Array(128 * 64).fill(0).map(() => Math.random() * 0.1 - 0.05),
      b2: Array(64).fill(0),
      w3: Array(64 * 32).fill(0).map(() => Math.random() * 0.1 - 0.05),
      b3: Array(32).fill(0)
    };
    return weights;
  }
  
  saveModel() {
    fs.writeFileSync(this.modelFile, JSON.stringify(this.model, null, 2));
  }
  
  loadMemory() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
        this.knowledgeBase = data.knowledgeBase || [];
        this.metrics = data.metrics || this.metrics;
      }
    } catch(e) {}
  }
  
  saveMemory() {
    fs.writeFileSync(this.memoryFile, JSON.stringify({
      knowledgeBase: this.knowledgeBase,
      metrics: this.metrics
    }, null, 2));
  }
  
  // Forward pass through neural network
  forward(inputFeatures) {
    // Layer 1: input -> hidden1
    let hidden1 = Array(128).fill(0);
    for (let i = 0; i < 128; i++) {
      let sum = this.model.b1[i];
      for (let j = 0; j < inputFeatures.length && j < 64; j++) {
        sum += inputFeatures[j] * this.model.w1[j * 128 + i];
      }
      hidden1[i] = this.relu(sum);
    }
    
    // Layer 2: hidden1 -> hidden2
    let hidden2 = Array(64).fill(0);
    for (let i = 0; i < 64; i++) {
      let sum = this.model.b2[i];
      for (let j = 0; j < 128; j++) {
        sum += hidden1[j] * this.model.w2[j * 64 + i];
      }
      hidden2[i] = this.relu(sum);
    }
    
    // Layer 3: hidden2 -> output
    let output = Array(32).fill(0);
    for (let i = 0; i < 32; i++) {
      let sum = this.model.b3[i];
      for (let j = 0; j < 64; j++) {
        sum += hidden2[j] * this.model.w3[j * 32 + i];
      }
      output[i] = this.sigmoid(sum);
    }
    
    return { hidden1, hidden2, output };
  }
  
  // Backpropagation (learning!)
  backward(inputFeatures, targetOutput, learningRate = 0.01) {
    // Forward pass first
    const { hidden1, hidden2, output } = this.forward(inputFeatures);
    
    // Calculate output error
    const outputError = Array(32).fill(0);
    for (let i = 0; i < 32; i++) {
      outputError[i] = (targetOutput[i] - output[i]) * output[i] * (1 - output[i]);
    }
    
    // Update w3 and b3
    for (let i = 0; i < 32; i++) {
      this.model.b3[i] += learningRate * outputError[i];
      for (let j = 0; j < 64; j++) {
        this.model.w3[j * 32 + i] += learningRate * outputError[i] * hidden2[j];
      }
    }
    
    // Calculate hidden2 error
    const hidden2Error = Array(64).fill(0);
    for (let i = 0; i < 64; i++) {
      let sum = 0;
      for (let j = 0; j < 32; j++) {
        sum += outputError[j] * this.model.w3[i * 32 + j];
      }
      hidden2Error[i] = sum * (hidden2[i] > 0 ? 1 : 0.01);
    }
    
    // Update w2 and b2
    for (let i = 0; i < 64; i++) {
      this.model.b2[i] += learningRate * hidden2Error[i];
      for (let j = 0; j < 128; j++) {
        this.model.w2[j * 64 + i] += learningRate * hidden2Error[i] * hidden1[j];
      }
    }
    
    // Calculate hidden1 error
    const hidden1Error = Array(128).fill(0);
    for (let i = 0; i < 128; i++) {
      let sum = 0;
      for (let j = 0; j < 64; j++) {
        sum += hidden2Error[j] * this.model.w2[i * 64 + j];
      }
      hidden1Error[i] = sum * (hidden1[i] > 0 ? 1 : 0.01);
    }
    
    // Update w1 and b1
    for (let i = 0; i < 128; i++) {
      this.model.b1[i] += learningRate * hidden1Error[i];
      for (let j = 0; j < inputFeatures.length && j < 64; j++) {
        this.model.w1[j * 128 + i] += learningRate * hidden1Error[i] * inputFeatures[j];
      }
    }
    
    return this.calculateLoss(output, targetOutput);
  }
  
  // Extract features from text (simplified embedding)
  extractFeatures(text) {
    const features = Array(64).fill(0);
    const words = text.toLowerCase().split(' ');
    
    // Simple TF-IDF style features
    for (let i = 0; i < words.length && i < 64; i++) {
      const hash = this.hashString(words[i]);
      features[hash % 64] += 1;
    }
    
    // Normalize
    const max = Math.max(...features);
    if (max > 0) {
      for (let i = 0; i < 64; i++) {
        features[i] /= max;
      }
    }
    
    return features;
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
  
  relu(x) { return Math.max(0, x); }
  sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  
  calculateLoss(predicted, target) {
    let loss = 0;
    for (let i = 0; i < predicted.length; i++) {
      loss += Math.pow(target[i] - predicted[i], 2);
    }
    return loss / predicted.length;
  }
  
  // Generate response using neural network
  generateResponse(userInput, expectedOutput = null) {
    const features = this.extractFeatures(userInput);
    const { output } = this.forward(features);
    
    // Convert output to text (simplified)
    const response = this.outputToText(output);
    
    // If expected output provided, train immediately (supervised learning)
    if (expectedOutput) {
      const targetFeatures = this.extractFeatures(expectedOutput);
      const loss = this.backward(features, targetFeatures, this.metrics.epsilon);
      this.metrics.loss = loss;
      this.saveModel();
    }
    
    return response;
  }
  
  outputToText(output) {
    // Simplified: use output to select from response templates
    const templates = [
      "I understand. Based on my training, I think...",
      "That's interesting. Let me learn from this.",
      "I'm processing that information.",
      "Thanks for teaching me. I'll remember that.",
      "I'm adapting my responses based on this interaction."
    ];
    
    const index = Math.floor(output[0] * templates.length);
    return templates[Math.min(index, templates.length - 1)];
  }
  
  // Reinforcement learning from feedback
  async learn(userInput, response, feedback, expectedResponse = null) {
    const features = this.extractFeatures(userInput);
    let reward = 0;
    
    if (feedback === 'positive') {
      reward = 1.0;
      this.metrics.positiveFeedback++;
    } else if (feedback === 'negative') {
      reward = -0.5;
      this.metrics.negativeFeedback++;
    }
    
    // Calculate target output based on reward
    let targetOutput;
    if (expectedResponse) {
      // Supervised: target is the expected response features
      targetOutput = this.extractFeatures(expectedResponse);
    } else {
      // Reinforcement: target is current output adjusted by reward
      const { output } = this.forward(features);
      targetOutput = output.map(v => Math.min(1, Math.max(0, v + reward * 0.1)));
    }
    
    // Backpropagate to learn
    const loss = this.backward(features, targetOutput, this.metrics.epsilon);
    
    // Store interaction
    this.knowledgeBase.push({
      timestamp: new Date().toISOString(),
      userInput,
      response,
      feedback,
      reward,
      loss
    });
    
    // Update metrics
    this.metrics.totalInteractions++;
    this.metrics.accuracy = this.metrics.positiveFeedback / this.metrics.totalInteractions;
    this.metrics.epsilon = Math.max(0.05, this.metrics.epsilon * 0.995);  // Decay exploration
    
    // Keep only last 1000 interactions
    if (this.knowledgeBase.length > 1000) {
      this.knowledgeBase = this.knowledgeBase.slice(-1000);
    }
    
    this.saveMemory();
    this.saveModel();
    
    return { reward, loss, epsilon: this.metrics.epsilon };
  }
  
  getTrainingStatus() {
    return {
      totalInteractions: this.metrics.totalInteractions,
      accuracy: (this.metrics.accuracy * 100).toFixed(1) + '%',
      loss: this.metrics.loss.toFixed(4),
      epsilon: this.metrics.epsilon.toFixed(3),
      positiveFeedback: this.metrics.positiveFeedback,
      negativeFeedback: this.metrics.negativeFeedback,
      memorySize: this.knowledgeBase.length,
      modelVersion: Date.now()
    };
  }
}

module.exports = { ChameleonRL };
