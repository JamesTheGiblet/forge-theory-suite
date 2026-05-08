const fs = require('fs');
const path = require('path');

class ContextEngine {
  constructor() {
    this.memoryFile = path.join(__dirname, '../data/legion_memory.json');
    this.memory = this.loadMemory();
    this.conversationHistory = [];
  }
  
  loadMemory() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        return JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
      }
    } catch(e) {}
    return { user: { name: "James" }, conversations: [], last_interaction: null };
  }
  
  saveMemory() {
    fs.writeFileSync(this.memoryFile, JSON.stringify(this.memory, null, 2));
  }
  
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }
  
  getGreeting() {
    const timeOfDay = this.getTimeOfDay();
    const name = this.memory.user.name;
    const greetings = {
      morning: `Good morning, ${name}. I hope you're having a good morning.`,
      afternoon: `Good afternoon, ${name}. I hope your day is going well.`,
      evening: `Good evening, ${name}. I hope you've had a productive day.`
    };
    return greetings[timeOfDay];
  }
  
  getSystemContext(systemStatus) {
    const timeOfDay = this.getTimeOfDay();
    let context = `${this.getGreeting()} `;
    
    if (systemStatus) {
      context += `Legion is performing as designed. `;
      context += `All systems nominal. `;
      context += `Entropy is ${systemStatus.entropy}. `;
      context += `${systemStatus.agents} agents running. `;
      context += `Paper mode ${systemStatus.paper_mode}. `;
    }
    
    return context;
  }
  
  async rememberConversation(userInput, response) {
    this.conversationHistory.push({
      timestamp: new Date().toISOString(),
      user: userInput,
      legion: response,
      timeOfDay: this.getTimeOfDay()
    });
    
    // Keep last 100 conversations
    if (this.conversationHistory.length > 100) {
      this.conversationHistory.shift();
    }
    
    this.memory.conversations = this.conversationHistory;
    this.memory.last_interaction = new Date().toISOString();
    this.saveMemory();
  }
  
  getLastInteraction() {
    return this.memory.last_interaction;
  }
  
  async preemptUser(userInput) {
    const lower = userInput.toLowerCase();
    
    // Detect morning check pattern
    if (lower.includes('good morning') || (this.getTimeOfDay() === 'morning' && this.conversationHistory.length === 0)) {
      return true; // Should give proactive greeting
    }
    
    // Detect coffee/work patterns
    if (lower.includes('coffee') || lower.includes('work')) {
      return true;
    }
    
    return false;
  }
}

module.exports = { ContextEngine };
