// Tactical Demo Engine - Scanning then activating
class TEDemoEngine {
  constructor(config, notifier, exchange) {
    this.config = config;
    this.notifier = notifier;
    this.exchange = exchange;
    this.state = 'SCANNING';
    this.cycleCount = 0;
    this.isRunning = true;
    this.dryRun = true;
  }
  
  async start() {
    console.log('T.E Demo engine started');
  }
  
  async stop() {
    this.isRunning = false;
  }
  
  async runCycle() {
    this.cycleCount++;
    
    // Pattern: SCANNING for 3 cycles, ACTIVE for 2, STANDBY for 1
    const pattern = ['SCANNING', 'SCANNING', 'SCANNING', 'ACTIVE', 'ACTIVE', 'STANDBY'];
    this.state = pattern[this.cycleCount % pattern.length];
    
    // Log state changes
    if (this.cycleCount % pattern.length === 0) {
      console.log(`[te-demo] Entering ${this.state} at cycle ${this.cycleCount}`);
    }
    
    return { state: this.state, cycle: this.cycleCount };
  }
  
  getStatus() {
    return {
      id: 'te-demo',
      name: 'T.E Demo',
      state: this.state,
      cycleCount: this.cycleCount,
      isRunning: this.isRunning,
      dryRun: this.dryRun,
      type: 'TACTICAL'
    };
  }
  
  getState() {
    return this.state;
  }
}

module.exports = TEDemoEngine;
