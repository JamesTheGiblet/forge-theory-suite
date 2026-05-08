const fs = require('fs');
const path = require('path');

class ChameleonTrainerSCP {
  constructor() {
    this.scpPath = path.join(__dirname, '../scp/training.scp.json');
    this.memoryFile = path.join(__dirname, '../data/chameleon_memory.json');
    this.curriculum = null;
    this.chameleon = null;
    this.loadCurriculum();
  }
  
  loadCurriculum() {
    try {
      this.curriculum = JSON.parse(fs.readFileSync(this.scpPath, 'utf8'));
      console.log(`📚 Loaded training curriculum: ${this.curriculum.scp_id}`);
      console.log(`   Modules: ${this.curriculum.curriculum.modules.length}`);
      
      let total = 0;
      for (const module of this.curriculum.curriculum.modules) {
        total += module.questions.length;
      }
      console.log(`   Total questions: ${total}`);
    } catch(e) {
      console.error('Failed to load curriculum:', e.message);
    }
  }
  
  loadChameleon() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        this.chameleon = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
      } else {
        this.chameleon = {
          knowledgeBase: [],
          userPreferences: { responseLength: 'medium', technicalLevel: 'medium', preferredTopics: [], feedbackHistory: [] },
          personality: 'adaptive',
          learningRate: 0.3
        };
      }
    } catch(e) {
      this.chameleon = { knowledgeBase: [] };
    }
  }
  
  saveChameleon() {
    fs.writeFileSync(this.memoryFile, JSON.stringify(this.chameleon, null, 2));
  }
  
  async train() {
    console.log('\n🦎 Starting Chameleon Training from SCP Curriculum...\n');
    
    this.loadChameleon();
    let trained = 0;
    let skipped = 0;
    
    for (const module of this.curriculum.curriculum.modules) {
      console.log(`\n📖 Module: ${module.name}`);
      console.log('─'.repeat(50));
      
      for (const item of module.questions) {
        // Check if already trained
        const alreadyTrained = this.chameleon.knowledgeBase.some(
          k => k.userInput === item.q && k.feedback === 'positive'
        );
        
        if (alreadyTrained && this.chameleon.knowledgeBase.length > 50) {
          skipped++;
          continue;
        }
        
        // Generate a response (simulate Chameleon learning)
        const response = this.generateResponse(item.q, module.name);
        
        // Store as positive training example
        this.chameleon.knowledgeBase.push({
          timestamp: new Date().toISOString(),
          userInput: item.q,
          expectedResponse: item.expected,
          actualResponse: response,
          feedback: 'positive',
          module: module.name,
          trained: true
        });
        
        trained++;
        process.stdout.write(`  ✅ Trained: ${item.q.substring(0, 40)}...\n`);
        
        // Small delay to simulate learning
        await new Promise(r => setTimeout(r, 10));
      }
    }
    
    // Update personality based on training
    this.chameleon.personality = 'trained';
    this.chameleon.learningRate = 0.2;
    this.chameleon.lastTraining = new Date().toISOString();
    
    this.saveChameleon();
    
    console.log('\n' + '═'.repeat(50));
    console.log(`📊 Training Complete!`);
    console.log(`   • Trained: ${trained} new interactions`);
    console.log(`   • Skipped: ${skipped} already known`);
    console.log(`   • Total memory: ${this.chameleon.knowledgeBase.length} interactions`);
    console.log(`   • Personality: ${this.chameleon.personality}`);
    console.log('═'.repeat(50));
  }
  
  generateResponse(question, moduleName) {
    // Find the expected response from curriculum
    for (const module of this.curriculum.curriculum.modules) {
      for (const item of module.questions) {
        if (item.q === question) {
          return item.expected;
        }
      }
    }
    return `I'm learning about "${question}". I'll get better with more training!`;
  }
  
  addUserMemory(key, value) {
    // Find or create user memory module
    let userModule = this.curriculum.curriculum.modules.find(m => m.user_memory);
    if (!userModule) {
      userModule = { name: "Personal Info", questions: [], user_memory: true };
      this.curriculum.curriculum.modules.push(userModule);
    }
    
    userModule.questions.push({ q: key, expected: value });
    fs.writeFileSync(this.scpPath, JSON.stringify(this.curriculum, null, 2));
    console.log(`📝 Added to memory: "${key}" → "${value}"`);
  }
}

// Run training
const trainer = new ChameleonTrainerSCP();
trainer.train().then(() => {
  console.log('\n✅ Chameleon is now pre-trained!');
  console.log('\nYou can still train more by talking to it directly:');
  console.log('  node scripts/train_chameleon.js');
});
