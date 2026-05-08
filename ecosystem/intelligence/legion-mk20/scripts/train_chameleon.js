const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Simple Chameleon for training (no engine dependency)
class ChameleonTrainer {
  constructor() {
    this.memoryFile = path.join(__dirname, '../data/chameleon_memory.json');
    this.knowledgeBase = [];
    this.userPreferences = {
      responseLength: 'medium',
      technicalLevel: 'medium',
      preferredTopics: [],
      feedbackHistory: []
    };
    this.learningRate = 0.3;
    this.personality = 'adaptive';
    this.loadMemory();
  }
  
  loadMemory() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const memory = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
        this.knowledgeBase = memory.knowledgeBase || [];
        this.userPreferences = memory.userPreferences || this.userPreferences;
        this.personality = memory.personality || 'adaptive';
        console.log(`📚 Loaded ${this.knowledgeBase.length} memories`);
      }
    } catch(e) {}
  }
  
  saveMemory() {
    const memory = {
      knowledgeBase: this.knowledgeBase,
      userPreferences: this.userPreferences,
      personality: this.personality,
      learningRate: this.learningRate,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(this.memoryFile, JSON.stringify(memory, null, 2));
  }
  
  generateResponse(userInput) {
    // Simple response generation based on learned patterns
    const lowerInput = userInput.toLowerCase();
    
    // Check for known patterns
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return "Hello! I'm Chameleon, your adaptive AI. I learn from our conversations. How can I help you today?";
    }
    
    if (lowerInput.includes('how are you')) {
      return `I'm adapting well! I've learned from ${this.knowledgeBase.length} interactions so far. My personality is currently ${this.personality}.`;
    }
    
    if (lowerInput.includes('what is your name')) {
      return "I'm Chameleon LM - an adaptive AI that changes based on your feedback!";
    }
    
    if (lowerInput.includes('personality')) {
      return `My current personality is ${this.personality}. I adapt based on your feedback!`;
    }
    
    // Default response
    return `I'm learning about "${userInput}". Based on our ${this.knowledgeBase.length} conversations, I'm adapting to your style. Was this helpful?`;
  }
  
  async learn(interaction, feedback) {
    this.knowledgeBase.push({
      timestamp: new Date().toISOString(),
      userInput: interaction.userInput,
      response: interaction.response,
      feedback: feedback,
      personality: this.personality
    });
    
    this.userPreferences.feedbackHistory.push(feedback);
    
    // Keep only last 500 interactions
    if (this.knowledgeBase.length > 500) {
      this.knowledgeBase = this.knowledgeBase.slice(-500);
    }
    
    this.adaptPersonality();
    this.saveMemory();
    console.log(`\n📝 Learned! Memory: ${this.knowledgeBase.length} interactions | Personality: ${this.personality}`);
  }
  
  adaptPersonality() {
    const total = this.userPreferences.feedbackHistory.length;
    const positive = this.userPreferences.feedbackHistory.filter(f => f === 'positive').length;
    const rate = total > 0 ? positive / total : 0.5;
    
    if (rate > 0.7) {
      this.personality = 'aligned';
      this.learningRate = Math.max(0.1, this.learningRate - 0.02);
    } else if (rate < 0.3) {
      this.personality = 'exploring';
      this.learningRate = Math.min(0.5, this.learningRate + 0.02);
    } else {
      this.personality = 'adaptive';
    }
  }
  
  getStatus() {
    const total = this.userPreferences.feedbackHistory.length;
    const positive = this.userPreferences.feedbackHistory.filter(f => f === 'positive').length;
    const rate = total > 0 ? (positive / total * 100).toFixed(0) : 0;
    
    return {
      totalInteractions: this.knowledgeBase.length,
      personality: this.personality,
      learningRate: this.learningRate,
      positiveFeedbackRate: `${rate}%`,
      memorySize: this.knowledgeBase.length
    };
  }
  
  reset() {
    this.knowledgeBase = [];
    this.userPreferences = {
      responseLength: 'medium',
      technicalLevel: 'medium',
      preferredTopics: [],
      feedbackHistory: []
    };
    this.personality = 'adaptive';
    this.learningRate = 0.3;
    this.saveMemory();
    console.log('🔄 Memory reset! Starting fresh.');
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function trainChameleon() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              🦎 CHAMELEON LM — TRAINING MODE                    ║');
  console.log('║         Talk to me. Rate my responses to help me learn.         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const chameleon = new ChameleonTrainer();
  
  console.log(`📊 Current status:`);
  console.log(`   • Memory: ${chameleon.knowledgeBase.length} interactions`);
  console.log(`   • Personality: ${chameleon.personality}`);
  console.log(`   • Learning rate: ${chameleon.learningRate}\n`);
  console.log('Commands:');
  console.log('   • "status" - Show training status');
  console.log('   • "reset" - Reset memory');
  console.log('   • "exit" - Exit training\n');
  
  function chat() {
    rl.question('🧑 You: ', async (userInput) => {
      if (userInput.toLowerCase() === 'exit') {
        console.log(`\n📊 Final training summary:`);
        console.log(chameleon.getStatus());
        console.log('\n✅ Training complete! Chameleon has learned from you.\n');
        rl.close();
        return;
      }
      
      if (userInput.toLowerCase() === 'status') {
        console.log('\n📊 Training Status:');
        console.log(chameleon.getStatus());
        console.log('');
        chat();
        return;
      }
      
      if (userInput.toLowerCase() === 'reset') {
        chameleon.reset();
        chat();
        return;
      }
      
      // Generate response
      const response = chameleon.generateResponse(userInput);
      console.log(`\n🦎 Chameleon: ${response}\n`);
      
      // Get feedback
      rl.question('Was this response helpful? (👍 y / 👎 n / ⏭️ s to skip): ', async (feedback) => {
        let feedbackType = null;
        if (feedback.toLowerCase() === 'y' || feedback === '👍') {
          feedbackType = 'positive';
          console.log('👍 Great! I learned from that.\n');
        } else if (feedback.toLowerCase() === 'n' || feedback === '👎') {
          feedbackType = 'negative';
          console.log('👎 Noted. I will adjust.\n');
        } else {
          console.log('⏭️ Skipping feedback.\n');
          chat();
          return;
        }
        
        await chameleon.learn({ userInput, response }, feedbackType);
        chat();
      });
    });
  }
  
  chat();
}

trainChameleon();
