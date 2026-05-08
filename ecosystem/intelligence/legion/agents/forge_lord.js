const { sendMessage, registerHandler } = require('../bus/router');
const { Mutator } = require('./mutator');
const fs = require('fs');
const path = require('path');

let activeMutators = [];
let strategies = [];

function loadStrategies() {
  const strategiesDir = path.join(__dirname, '../strategies/active');
  
  if (!fs.existsSync(strategiesDir)) {
    fs.mkdirSync(strategiesDir, { recursive: true });
    strategies = [];
    return;
  }
  
  const files = fs.readdirSync(strategiesDir).filter(f => f.endsWith('.json'));
  strategies = files.map(file => {
    try {
      const content = fs.readFileSync(path.join(strategiesDir, file), 'utf8');
      return JSON.parse(content);
    } catch (err) {
      return null;
    }
  }).filter(s => s);
  
  console.log(`[FORGE] Loaded ${strategies.length} strategies`);
}

function saveStrategy(strategy) {
  const strategiesDir = path.join(__dirname, '../strategies/active');
  const fileName = `${strategy.scp_id}_${strategy.name.toLowerCase().replace(/ /g, '_')}.json`;
  const filePath = path.join(strategiesDir, fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(strategy, null, 2));
  console.log(`[FORGE] Saved strategy: ${fileName}`);
}

function startForgeLord() {
  loadStrategies();
  
  // Spawn mutators periodically
  setInterval(() => {
    if (activeMutators.length < 3 && strategies.length > 0) {
      const mutator = new Mutator();
      activeMutators.push(mutator);
      console.log(`[FORGE] Spawned mutator (${activeMutators.length}/3 active)`);
      
      // Mutate a random strategy
      const parentStrategy = strategies[Math.floor(Math.random() * strategies.length)];
      const mutated = mutator.mutate(parentStrategy);
      
      if (mutated) {
        saveStrategy(mutated);
        loadStrategies(); // Reload to include new strategy
        
        // Send to tournament for evaluation
        sendMessage('tournament', 'NEW_STRATEGY', { strategy: mutated });
      }
      
      // Remove mutator after it completes
      setTimeout(() => {
        activeMutators = activeMutators.filter(m => m !== mutator);
      }, 10000);
    }
  }, 30000);
  
  registerHandler('REGIME_UPDATE', (msg) => {
    console.log(`[FORGE] Regime updated: ${msg.payload.regime}`);
  });
  
  console.log('[FORGE] Lord active – max mutators: 3');
}

module.exports = { startForgeLord };
