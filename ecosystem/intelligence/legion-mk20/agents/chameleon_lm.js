const { BaseAgent } = require('./base_agent');
const fs = require('fs');
const path = require('path');

class ChameleonLM extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.learningRate = this.learning_rate || 0.3;
    this.memoryRetention = this.memory_retention_days || 30;
    this.personality = this.personality || 'adaptive';
    this.memoryFile = path.join(__dirname, '../data/chameleon_memory.json');
    this.knowledgeBase = [];
    this.userPreferences = {
      responseLength: 'medium', // short, medium, detailed
      technicalLevel: 'medium', // beginner, medium, expert
      preferredTopics: [],
      feedbackHistory: []
    };
    this.loadMemory();
  }
  
  async start() {
    await super.start();
    this.log(`Chameleon LM active. Learning rate: ${this.learningRate}`);
    this.log(`Personality: ${this.personality}`);
    this.log(`Memory: ${this.knowledgeBase.length} stored interactions`);
    return true;
  }
  
  loadMemory() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const memory = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
        this.knowledgeBase = memory.knowledgeBase || [];
        this.userPreferences = memory.userPreferences || this.userPreferences;
        this.log(`Loaded ${this.knowledgeBase.length} memories`);
      }
    } catch(e) {}
  }
  
  saveMemory() {
    const memory = {
      knowledgeBase: this.knowledgeBase,
      userPreferences: this.userPreferences,
      lastUpdated: new Date().toISOString(),
      totalInteractions: this.knowledgeBase.length
    };
    fs.writeFileSync(this.memoryFile, JSON.stringify(memory, null, 2));
  }
  
  async learn(interaction, feedback) {
    // Store interaction
    this.knowledgeBase.push({
      timestamp: new Date().toISOString(),
      userInput: interaction.userInput,
      response: interaction.response,
      feedback: feedback,
      context: interaction.context
    });
    
    // Update user preferences based on feedback
    if (feedback === 'positive') {
      this.userPreferences.preferredTopics.push(interaction.topic);
      // Keep only last 50 topics
      if (this.userPreferences.preferredTopics.length > 50) {
        this.userPreferences.preferredTopics = this.userPreferences.preferredTopics.slice(-50);
      }
    }
    
    // Adjust learning rate
    if (this.knowledgeBase.length > 100) {
      this.learningRate = Math.max(0.1, this.learningRate - 0.01);
    }
    
    this.saveMemory();
    this.log(`Learned from interaction. Total memories: ${this.knowledgeBase.length}`);
  }
  
  async adaptPersonality() {
    // Analyze user preferences to adjust personality
    const topics = this.userPreferences.preferredTopics;
    const feedbackPositive = this.userPreferences.feedbackHistory.filter(f => f === 'positive').length;
    const totalFeedback = this.userPreferences.feedbackHistory.length;
    const positiveRate = totalFeedback > 0 ? feedbackPositive / totalFeedback : 0.5;
    
    if (positiveRate > 0.7) {
      this.personality = 'aligned';
    } else if (positiveRate < 0.3) {
      this.personality = 'adaptive';
    }
    
    this.log(`Personality adapted to: ${this.personality} (${(positiveRate*100).toFixed(0)}% positive feedback)`);
  }
  
  async generateResponse(userInput, context) {
    // Find similar past interactions
    const similar = this.findSimilarInteractions(userInput);
    
    // Build response based on learned preferences
    let response = await this.createResponse(userInput, context, similar);
    
    return response;
  }
  
  findSimilarInteractions(input) {
    // Simple keyword matching for similarity
    const keywords = input.toLowerCase().split(' ');
    return this.knowledgeBase.filter(k => 
      keywords.some(kw => k.userInput?.toLowerCase().includes(kw))
    ).slice(-5);
  }
  
  async createResponse(userInput, context, similar) {
    // Use Gemini context if available
    try {
      const { callGemini } = require('./gemini_assistant');
      if (callGemini) {
        const prompt = this.buildPrompt(userInput, context, similar);
        const response = await callGemini(prompt);
        return response;
      }
    } catch(e) {}
    
    // Fallback response
    return `I'm learning about "${userInput}". Based on our ${this.knowledgeBase.length} past conversations, I'm adapting to your preferences.`;
  }
  
  buildPrompt(userInput, context, similar) {
    let prompt = `You are Chameleon, an adaptive AI learning from user interactions.
    
Current personality: ${this.personality}
User preferences: ${JSON.stringify(this.userPreferences)}
Similar past interactions: ${similar.length}

User: ${userInput}

Respond naturally, adapting to the user's style based on learned preferences.`;
    return prompt;
  }
  
  getTrainingStatus() {
    return {
      totalInteractions: this.knowledgeBase.length,
      learningRate: this.learningRate,
      personality: this.personality,
      userPreferences: this.userPreferences,
      memorySize: this.knowledgeBase.length
    };
  }
  
  async resetMemory() {
    this.knowledgeBase = [];
    this.userPreferences = {
      responseLength: 'medium',
      technicalLevel: 'medium',
      preferredTopics: [],
      feedbackHistory: []
    };
    this.saveMemory();
    this.log('Memory reset. Starting fresh.');
  }
}

module.exports = { ChameleonLM };
