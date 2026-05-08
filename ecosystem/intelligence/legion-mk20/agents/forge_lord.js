const { Mutator } = require('./mutator');
const fs = require('fs');
const path = require('path');

class ForgeLord {
  constructor() {
    this.activeMutators = 0;
    this.maxMutators = 3;
    this.strategyDir = "./data/strategies";
    this.autoGenerate = true;
    this.generationInterval = 60000;
    this.interval = null;
    this.strategies = [];
  }
  
  async start() {
    console.log('[ForgeLord] Starting...');
    // Ensure directory exists
    if (!fs.existsSync(this.strategyDir)) {
      fs.mkdirSync(this.strategyDir, { recursive: true });
      console.log('[ForgeLord] Created strategies directory');
    }
    // Load existing strategies
    this.loadExistingStrategies();
    // Start generation cycle
    if (this.autoGenerate) {
      this.startGenerationCycle();
    }
    console.log('[ForgeLord] Forge Lord active. Max mutators:', this.maxMutators);
  }
  
  loadExistingStrategies() {
    if (fs.existsSync(this.strategyDir)) {
      const files = fs.readdirSync(this.strategyDir).filter(f => f.endsWith('.json'));
      this.strategies = files.map(file => {
        try {
          return JSON.parse(fs.readFileSync(path.join(this.strategyDir, file), 'utf8'));
        } catch(e) { return null; }
      }).filter(s => s);
      console.log(`[ForgeLord] Loaded ${this.strategies.length} existing strategies`);
    } else {
      console.log('[ForgeLord] No existing strategies found, will create new ones');
    }
  }
  
  startGenerationCycle() {
    this.interval = setInterval(() => {
      if (this.activeMutators < this.maxMutators) {
        this.spawnMutator();
      }
    }, this.generationInterval);
    // Spawn first mutator immediately
    setTimeout(() => this.spawnMutator(), 1000);
  }
  
  spawnMutator() {
    this.activeMutators++;
    console.log(`[ForgeLord] Mutator spawned (${this.activeMutators}/${this.maxMutators})`);
    
    // Create a new strategy by mutating either a random existing strategy or a base template
    const parent = (this.strategies.length > 0 && Math.random() > 0.3) 
      ? this.strategies[Math.floor(Math.random() * this.strategies.length)]
      : null;
    
    const mutator = new Mutator();
    let newStrategy;
    try {
      newStrategy = mutator.mutate(parent);
      if (!newStrategy || !newStrategy.scp_id) {
        throw new Error('Invalid strategy generated');
      }
      this.saveStrategy(newStrategy);
    } catch (err) {
      console.error('[ForgeLord] Mutation failed:', err.message);
    }
    
    // Mutator finishes after a delay
    setTimeout(() => {
      this.activeMutators--;
      console.log(`[ForgeLord] Mutator finished (${this.activeMutators}/${this.maxMutators} active)`);
    }, 10000);
  }
  
  saveStrategy(strategy) {
    const filename = `${strategy.scp_id}_${strategy.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    const filepath = path.join(this.strategyDir, filename);
    // Ensure strategy has required fields
    if (!strategy.created_at) strategy.created_at = new Date().toISOString();
    fs.writeFileSync(filepath, JSON.stringify(strategy, null, 2));
    this.strategies.push(strategy);
    console.log(`[ForgeLord] ✅ Saved new strategy: ${strategy.scp_id} (${strategy.object_class}) to ${filepath}`);
    
    // Optional: Trigger audit (could be done via message bus)
    // For now, just log
  }
  
  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}

module.exports = { ForgeLord };
