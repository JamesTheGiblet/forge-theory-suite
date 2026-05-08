const { BaseAgent } = require('./base_agent');
const fs = require('fs');
const path = require('path');

class LiveTradingGate extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.breachesRequired = 0;
    this.currentBreaches = 0;
    this.paperHoursRequired = 48;
    this.paperStartTime = Date.now();
    this.liveEnabled = false;
    this.checkInterval = null;
  }
  
  async start() {
    await super.start();
    this.loadState();
    this.startMonitoring();
    this.log(`Live Trading Gate active. Need 0 breaches and ${this.paperHoursRequired}h paper mode`);
    return true;
  }
  
  loadState() {
    const statePath = path.join(__dirname, '../data/live_gate_state.json');
    try {
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        this.currentBreaches = state.currentBreaches || 0;
        this.liveEnabled = state.liveEnabled || false;
        this.paperStartTime = state.paperStartTime || Date.now();
      }
    } catch(e) {}
  }
  
  saveState() {
    const statePath = path.join(__dirname, '../data/live_gate_state.json');
    fs.writeFileSync(statePath, JSON.stringify({
      currentBreaches: this.currentBreaches,
      liveEnabled: this.liveEnabled,
      paperStartTime: this.paperStartTime
    }, null, 2));
  }
  
  startMonitoring() {
    this.checkInterval = setInterval(() => this.checkConditions(), 60000); // Check every minute
    setTimeout(() => this.checkConditions(), 1000);
  }
  
  async checkConditions() {
    // Get current breaches from engine
    this.currentBreaches = this.engine.apollyonEvents.length;
    
    const paperHoursElapsed = (Date.now() - this.paperStartTime) / (1000 * 60 * 60);
    const paperComplete = paperHoursElapsed >= this.paperHoursRequired;
    const noBreaches = this.currentBreaches === 0;
    
    if (!this.liveEnabled && noBreaches && paperComplete) {
      this.liveEnabled = true;
      this.log('🎉 LIVE TRADING ENABLED! 48 hours paper mode completed with 0 breaches.');
      this.enableLiveTrading();
    } else if (!this.liveEnabled) {
      const hoursRemaining = Math.max(0, this.paperHoursRequired - paperHoursElapsed);
      this.log(`Paper mode: ${hoursRemaining.toFixed(1)}h remaining, Breaches: ${this.currentBreaches}`);
    }
    
    this.saveState();
  }
  
  async enableLiveTrading() {
    // Update .env
    const envPath = path.join(__dirname, '../.env');
    try {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/LIVE_TRADING=false/, 'LIVE_TRADING=true');
      fs.writeFileSync(envPath, envContent);
      this.log('✅ LIVE_TRADING=true set in .env');
    } catch(e) {}
    
    // Notify via Telegram
    const telegram = this.engine.agents.get('AGENT-TELEGRAM-016');
    if (telegram) {
      await telegram.sendAlert('LIVE_TRADING_ENABLED', '48 hours paper mode completed with 0 breaches. Live trading is now ACTIVE.');
    }
    
    this.engine.updateEntropy(-0.5, 'live_trading_enabled');
  }
  
  getStatus() {
    const paperHoursElapsed = (Date.now() - this.paperStartTime) / (1000 * 60 * 60);
    return {
      live_enabled: this.liveEnabled,
      breaches: this.currentBreaches,
      breaches_required: this.breachesRequired,
      paper_hours_elapsed: paperHoursElapsed.toFixed(1),
      paper_hours_required: this.paperHoursRequired,
      status: this.liveEnabled ? 'LIVE' : 'PAPER_ONLY'
    };
  }
}

module.exports = { LiveTradingGate };
