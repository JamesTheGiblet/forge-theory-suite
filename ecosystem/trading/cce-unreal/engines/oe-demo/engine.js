// Observer Demo Engine - Always active, counts observations
class OEDemoEngine {
  constructor(config, notifier, exchange) {
    this.config = config;
    this.notifier = notifier;
    this.exchange = exchange;
    this.state = 'ACTIVE';
    this.cycleCount = 0;
    this.isRunning = true;
    this.dryRun = true;
    this.obsCount = 0;
  }
  
  async start() {
    console.log('O.E Demo observer started');
  }
  
  async stop() {
    this.isRunning = false;
  }
  
  async runCycle() {
    this.cycleCount++;
    this.obsCount++;
    
    // Observer stays ACTIVE
    this.state = 'ACTIVE';
    
    // Emit observation every 5 cycles
    if (this.cycleCount % 5 === 0) {
      console.log(`[oe-demo] Observation #${this.obsCount} at cycle ${this.cycleCount}`);
      this.notifier.emit('observation', {
        engine: 'oe-demo',
        cycle: this.cycleCount,
        observations: this.obsCount
      });
    }
    
    return { 
      state: this.state, 
      cycle: this.cycleCount, 
      observations: this.obsCount 
    };
  }
  
  getStatus() {
    return {
      id: 'oe-demo',
      name: 'O.E Demo',
      state: this.state,
      cycleCount: this.cycleCount,
      obsCount: this.obsCount,
      isRunning: this.isRunning,
      dryRun: this.dryRun,
      type: 'OBSERVER'
    };
  }
  
  getState() {
    return this.state;
  }
}

module.exports = OEDemoEngine;
