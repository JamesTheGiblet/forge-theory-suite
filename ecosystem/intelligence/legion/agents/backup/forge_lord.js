const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const { sendMessage, registerHandler } = require('../bus/router');

const ACTIVE_DIR = path.join(__dirname, '../strategies/active');
const MUTATION_QUEUE_FILE = path.join(__dirname, '../data/mutation_queue.json');

const MAX_CONCURRENT_MUTATORS = 3;
const MUTATOR_TIMEOUT_MS = 60000;

let activeMutators = new Map();
let mutationQueue = [];
let activeStrategies = new Map();
let currentRegime = 'unknown';
let frozenLineages = new Set();

function loadStrategies() {
  if (!fs.existsSync(ACTIVE_DIR)) return;
  const files = fs.readdirSync(ACTIVE_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.tmp'));
  const newMap = new Map();
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(ACTIVE_DIR, file), 'utf8');
      const strategy = JSON.parse(content);
      newMap.set(file, strategy);
    } catch (err) {
      console.error(`[FORGE] Failed to load ${file}:`, err.message);
    }
  }
  activeStrategies = newMap;
  // console.log(`[FORGE] Loaded ${activeStrategies.size} strategies`);
  return activeStrategies;
}

function isStrategyActiveForRegime(strategy) {
  const activeRegimes = strategy.active_regimes || [];
  if (activeRegimes.length === 0) return true;
  if (activeRegimes.includes('any')) return true;
  return activeRegimes.includes(currentRegime);
}

function getActiveStrategiesByRegime() {
  const filtered = new Map();
  for (const [file, strategy] of activeStrategies) {
    if (isStrategyActiveForRegime(strategy)) {
      filtered.set(file, strategy);
    } else {
      // console.log(`[FORGE] Strategy ${strategy.scp_id} paused – regime ${currentRegime} not in ${strategy.active_regimes}`);
    }
  }
  return filtered;
}

function loadMutationQueue() {
  if (fs.existsSync(MUTATION_QUEUE_FILE)) {
    try {
      mutationQueue = JSON.parse(fs.readFileSync(MUTATION_QUEUE_FILE, 'utf8'));
    } catch (err) {}
  }
}

function saveMutationQueue() {
  fs.writeFileSync(MUTATION_QUEUE_FILE, JSON.stringify(mutationQueue, null, 2));
}

function spawnMutator(strategyPath, mutationTarget) {
  if (activeMutators.size >= MAX_CONCURRENT_MUTATORS) {
    // console.log(`[FORGE] Queueing mutation for ${path.basename(strategyPath)}`);
    mutationQueue.push({ strategyPath, mutationTarget, queuedAt: Date.now() });
    saveMutationQueue();
    return null;
  }

  // console.log(`[FORGE] Spawning Mutator for ${path.basename(strategyPath)}`);
  const mutator = fork(path.join(__dirname, 'mutator.js'), [strategyPath, JSON.stringify(mutationTarget)]);
  
  const timeoutHandle = setTimeout(() => {
    // console.log(`[FORGE] Mutator ${mutator.pid} timed out – killing`);
    mutator.kill('SIGKILL');
    activeMutators.delete(mutator.pid);
    processNextInQueue();
  }, MUTATOR_TIMEOUT_MS);
  
  activeMutators.set(mutator.pid, { strategyPath, mutationTarget, startTime: Date.now(), timeoutHandle });
  
  mutator.on('exit', (code) => {
    // console.log(`[FORGE] Mutator ${mutator.pid} exited with code ${code}`);
    const entry = activeMutators.get(mutator.pid);
    if (entry && entry.timeoutHandle) clearTimeout(entry.timeoutHandle);
    activeMutators.delete(mutator.pid);
    processNextInQueue();
  });
  return mutator;
}

function processNextInQueue() {
  if (mutationQueue.length === 0) return;
  if (activeMutators.size >= MAX_CONCURRENT_MUTATORS) return;
  const next = mutationQueue.shift();
  saveMutationQueue();
  spawnMutator(next.strategyPath, next.mutationTarget);
}

function scheduleGenerationCycle() {
  // console.log('[FORGE] Starting generation cycle');
  loadStrategies();
  const activeByRegime = getActiveStrategiesByRegime();
  
  if (activeByRegime.size === 0) {
    // console.log('[FORGE] No active strategies for current regime – spawning Scout');
    const scout = fork(path.join(__dirname, 'scout.js'));
    return;
  }
  
  const strategies = Array.from(activeByRegime.keys());
  const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
  const strategyPath = path.join(ACTIVE_DIR, randomStrategy);
  
  const mutationTargets = [
    { path: 'conditions.entry.all.0.value', min: 10, max: 50, step: 2 },
    { path: 'conditions.exit.any.0.value', min: 50, max: 90, step: 2 },
    { path: 'risk.max_spread_percent', min: 0.05, max: 0.5, step: 0.05 },
    { path: 'containment_procedures.max_drawdown_pct', min: 3, max: 15, step: 1 }
  ];
  const mutationTarget = mutationTargets[Math.floor(Math.random() * mutationTargets.length)];
  spawnMutator(strategyPath, mutationTarget);
}

function startForgeLord() {
  loadMutationQueue();
  loadStrategies();
  // console.log(`[FORGE] Lord active – max mutators: ${MAX_CONCURRENT_MUTATORS}, current regime: ${currentRegime}`);
  
  setInterval(() => scheduleGenerationCycle(), 6 * 60 * 60 * 1000);
  processNextInQueue();
}

registerHandler('VALIDATION_COMPLETE', (msg) => {
  if (msg.payload.objectClass === 'Keter') {
    // console.log(`[FORGE] Voting YES for Keter: ${msg.payload.strategyId}`);
    sendMessage('vote_manager', 'KETER_VOTE_REQUEST', {
      strategyId: msg.payload.strategyId,
      strategy: msg.payload.strategy,
      voter: 'ForgeLord'
    });
  }
});

registerHandler('REGIME_CHANGE', (msg) => {
  // console.log(`[FORGE] Regime update: ${msg.payload.old} → ${msg.payload.new}`);
  currentRegime = msg.payload.new;
  // console.log(`[FORGE] Current regime is now: ${currentRegime}`);
  scheduleGenerationCycle();
});

registerHandler('LINEAGE_THRASHING', (msg) => {
  const { parentId, reason, action } = msg.payload;
  // console.log(`[FORGE] Chameleon says lineage ${parentId} is THRASHING: ${reason}`);
  if (action === 'HALT_MUTATIONS') {
    frozenLineages.add(parentId);
    // console.log(`[FORGE] Frozen lineage ${parentId} - no further mutations`);
  }
});

registerHandler('LINEAGE_EVOLVING', (msg) => {
  const { parentId, reason } = msg.payload;
  // console.log(`[FORGE] Chameleon says lineage ${parentId} is EVOLVING: ${reason}`);
  if (frozenLineages.has(parentId)) {
    frozenLineages.delete(parentId);
    // console.log(`[FORGE] Unfrozen lineage ${parentId} - mutations resumed`);
  }
});

if (require.main === module) { startForgeLord(); }
module.exports = { startForgeLord, scheduleGenerationCycle };

// Handle new strategy generated by Auto-Strategy Generator
registerHandler('NEW_STRATEGY', (msg) => {
  const { strategyPath, strategyId } = msg.payload;
  // console.log(`[FORGE] New strategy detected: ${strategyId} at ${strategyPath}`);
  
  // Reload strategies to include the new one
  loadStrategies();
  
  // Optionally add to tournament
  sendMessage('tournament', 'ADD_STRATEGY', {
    strategyId: strategyId,
    strategy: activeStrategies.get(path.basename(strategyPath))
  });
  
  // console.log(`[FORGE] Strategy ${strategyId} added to active pool and tournament`);
});

// Handle new strategy generated by Auto-Strategy Generator
registerHandler('NEW_STRATEGY', (msg) => {
  const { strategyPath, strategyId } = msg.payload;
  // console.log(`[FORGE] New strategy detected: ${strategyId} at ${strategyPath}`);
  
  // Reload strategies to include the new one
  loadStrategies();
  
  // Optionally add to tournament
  sendMessage('tournament', 'ADD_STRATEGY', {
    strategyId: strategyId,
    strategy: activeStrategies.get(path.basename(strategyPath))
  });
  
  // console.log(`[FORGE] Strategy ${strategyId} added to active pool and tournament`);
});
