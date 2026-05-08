const { BaseAgent } = require('./base_agent');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class VoiceCommander extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.commands = this.commands || ['status', 'prices', 'report'];
    this.isListening = false;
    this.wakeWord = this.wake_word || 'LEGION';
  }
  
  async start() {
    await super.start();
    this.log(`Voice Commander active. Wake word: "${this.wakeWord}"`);
    this.startListening();
    return true;
  }
  
  startListening() {
    // Simulated listening (would use actual STT in production)
    this.log('Listening for voice commands...');
    
    // Demo: simulate command every 30 seconds for testing
    setInterval(() => {
      this.processCommand('status');
    }, 30000);
  }
  
  async processCommand(command) {
    this.log(`🎤 Command received: ${command}`);
    
    let response = '';
    switch(command.toLowerCase()) {
      case 'status':
        const status = await this.getStatus();
        response = `System status: Entropy ${status.entropy}, ${status.agents} agents running, paper mode active`;
        break;
      case 'prices':
        const price = await this.getPrice();
        response = `Current BTC price: $${price}`;
        break;
      case 'report':
        response = 'Generating report...';
        this.generateReport();
        break;
      case 'entropy':
        const entropy = this.engine.entropy;
        response = `Current entropy is ${entropy.toFixed(2)}. ${entropy > 0.7 ? 'Critical!' : entropy > 0.3 ? 'Elevated' : 'Normal'}`;
        break;
      default:
        response = `Command '${command}' not recognized. Try: status, prices, report, entropy`;
    }
    
    await this.speak(response);
    return response;
  }
  
  async speak(text) {
    if (this.tts_engine === 'espeak') {
      exec(`espeak "${text.replace(/"/g, '\\"')}"`, (err) => {
        if (err) this.log(`TTS error: ${err.message}`);
      });
    }
    this.log(`🔊 Speaking: ${text.substring(0, 100)}`);
  }
  
  async getStatus() {
    const status = this.engine.getStatus();
    return {
      entropy: this.engine.entropy,
      agents: this.engine.agents.size,
      paper_mode: this.engine.scp?.paper_mode?.status || 'RUNNING'
    };
  }
  
  async getPrice() {
    const { getCurrentPrice } = require('../shared/kraken_adapter.js');
    try {
      const price = await getCurrentPrice('XBT/USD');
      return price || 78000;
    } catch {
      return 78000;
    }
  }
  
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      command: 'voice_report',
      status: this.engine.getStatus(),
      entropy: this.engine.entropy
    };
    
    const reportPath = path.join(__dirname, '../reports/voice_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log('Voice report generated');
  }
  
  getStats() {
    return {
      wake_word: this.wakeWord,
      commands: this.commands,
      tts_engine: this.tts_engine,
      listening: this.isListening
    };
  }
}

module.exports = { VoiceCommander };
