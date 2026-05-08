/**
 * Cycle Runner - Runs cycles for all registered engines
 */

// Import correctly - check if it's a class or factory
let EngineRegistry;
try {
  const module = require('./src/engine-registry');
  EngineRegistry = module.EngineRegistry || module.default || module;
  console.log('✓ EngineRegistry loaded:', typeof EngineRegistry);
} catch(e) {
  console.error('Failed to load EngineRegistry:', e.message);
  process.exit(1);
}

const path = require('path');

async function runCycles() {
  console.log('\n🔄 CYCLE RUNNER STARTED');
  console.log('Press Ctrl+C to stop\n');
  
  // Initialize registry with required dependencies
  const config = { engines: { defaultDryRun: true } };
  const notifier = { 
    emit: (event, data) => console.log(`  📢 Event: ${event}`, data) 
  };
  const exchange = { 
    getBalance: () => ({ free: { USD: 10000 } }),
    getPrice: async () => 50000
  };
  
  try {
    const registry = new EngineRegistry(config, notifier, exchange);
    
    // Load engines
    const enginesPath = path.join(__dirname, 'engines');
    await registry.scan();
    
    const engines = registry.getAll();
    const engineIds = Object.keys(engines);
    
    console.log(`📦 Loaded ${engineIds.length} engines:`);
    engineIds.forEach(id => {
      const engine = engines[id];
      console.log(`   - ${id}: ${engine.getState ? engine.getState() : 'unknown'}`);
    });
    console.log('');
    
    let cycleCount = 0;
    
    // Run cycles every 10 seconds
    const interval = setInterval(async () => {
      cycleCount++;
      const timestamp = new Date().toISOString().substring(11, 19);
      console.log(`\n⏰ [${timestamp}] Cycle ${cycleCount}`);
      
      for (const [id, engine] of Object.entries(engines)) {
        try {
          if (typeof engine.runCycle === 'function') {
            await engine.runCycle();
            const state = engine.getState ? engine.getState() : engine.state;
            const cycleNum = engine.cycleCount || 0;
            console.log(`   ✓ ${id}: ${state} (cycle ${cycleNum})`);
          } else {
            console.log(`   ⚠ ${id}: no runCycle method`);
          }
        } catch (err) {
          console.log(`   ✗ ${id}: ${err.message}`);
        }
      }
    }, 10000);
    
    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping cycle runner...');
      clearInterval(interval);
      process.exit(0);
    });
    
  } catch (err) {
    console.error('Failed to initialize registry:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runCycles().catch(console.error);
