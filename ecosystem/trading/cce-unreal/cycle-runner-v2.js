/**
 * Cycle Runner v2 - Updates engine cycles via direct API calls
 * This simulates cycles without needing to access internal registry
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';
let cycleCount = 0;
let engineStates = {
  'oe-demo': { state: 'ACTIVE', cycle: 0, obsCount: 0 },
  'se-demo': { state: 'DORMANT', cycle: 0 },
  'te-demo': { state: 'SCANNING', cycle: 0 }
};

// State patterns for each engine
const patterns = {
  'se-demo': {
    states: ['DORMANT', 'IGNITION', 'CASCADE', 'EXTRACTION'],
    duration: 5  // 5 cycles per state
  },
  'te-demo': {
    states: ['SCANNING', 'SCANNING', 'SCANNING', 'ACTIVE', 'ACTIVE', 'STANDBY'],
    duration: 1
  },
  'oe-demo': {
    states: ['ACTIVE'],
    duration: 1
  }
};

function updateEngineState(engineId) {
  const pattern = patterns[engineId];
  if (!pattern) return;
  
  const stateIndex = Math.floor(engineStates[engineId].cycle / pattern.duration) % pattern.states.length;
  engineStates[engineId].state = pattern.states[stateIndex];
  
  if (engineId === 'oe-demo') {
    engineStates[engineId].obsCount = engineStates[engineId].cycle;
  }
}

async function cycleEngine(engineId) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      id: engineId,
      state: engineStates[engineId].state,
      cycleCount: engineStates[engineId].cycle,
      obsCount: engineStates[engineId].obsCount
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/engine/cycle',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      resolve();
    });
    
    req.on('error', () => resolve());
    req.write(data);
    req.end();
  });
}

async function runCycle() {
  cycleCount++;
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`\n⏰ [${timestamp}] Cycle ${cycleCount}`);
  
  for (const [engineId, state] of Object.entries(engineStates)) {
    // Increment cycle count
    state.cycle++;
    
    // Update state based on pattern
    updateEngineState(engineId);
    
    console.log(`   ✓ ${engineId}: ${state.state} (cycle ${state.cycle})${state.obsCount ? ` · ${state.obsCount} obs` : ''}`);
    
    // Send update to API (optional - just for display)
    await cycleEngine(engineId);
  }
  
  // Also update the overall market state
  const marketState = Object.values(engineStates).some(e => e.state === 'CASCADE') ? 'CASCADE' :
                      Object.values(engineStates).some(e => e.state === 'IGNITION') ? 'IGNITION' : 'DORMANT';
}

// Run cycles every 10 seconds
setInterval(runCycle, 10000);

console.log('🔄 CYCLE RUNNER V2 STARTED');
console.log('Press Ctrl+C to stop\n');

// Run first cycle immediately
runCycle();

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Cycle runner stopped');
  process.exit(0);
});
