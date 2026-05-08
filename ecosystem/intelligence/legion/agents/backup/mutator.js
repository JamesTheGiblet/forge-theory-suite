const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../bus/router');

const strategyPath = process.argv[2];
const mutationTarget = JSON.parse(process.argv[3]);

function mutateValue(currentValue, mutation) {
  const { min, max, step } = mutation;
  let newValue = currentValue;
  const delta = (Math.random() > 0.5 ? step : -step);
  newValue = currentValue + delta;
  if (min !== undefined) newValue = Math.max(min, newValue);
  if (max !== undefined) newValue = Math.min(max, newValue);
  if (step) newValue = Math.round(newValue / step) * step;
  return newValue;
}

function getValueByPath(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setValueByPath(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => current[key] = current[key] || {}, obj);
  target[lastKey] = value;
}

function generateNewId() {
  const activeDir = path.join(__dirname, '../strategies/active');
  if (!fs.existsSync(activeDir)) return 'STRAT-001';
  const existing = fs.readdirSync(activeDir)
    .filter(f => f.match(/^STRAT-\d{3}/))
    .map(f => parseInt(f.match(/STRAT-(\d{3})/)[1]));
  const maxId = Math.max(0, ...existing);
  const newNum = String(maxId + 1).padStart(3, '0');
  return `STRAT-${newNum}`;
}

function mutateStrategy() {
  if (!strategyPath || !fs.existsSync(strategyPath)) {
    console.error(`[MUTATOR] Strategy not found: ${strategyPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(strategyPath, 'utf8');
  const strategy = JSON.parse(content);
  const originalValue = getValueByPath(strategy, mutationTarget.path);
  
  if (originalValue === undefined) {
    console.error(`[MUTATOR] Path not found: ${mutationTarget.path}`);
    process.exit(1);
  }
  
  const newValue = mutateValue(originalValue, mutationTarget);
  setValueByPath(strategy, mutationTarget.path, newValue);
  
  strategy.lineage = {
    parent: strategy.scp_id,
    mutated_by: `Mutator_${process.pid}`,
    generation: (strategy.lineage?.generation || 0) + 1,
    mutation_date: new Date().toISOString().split('T')[0]
  };
  
  const newId = generateNewId();
  strategy.scp_id = newId;
  
  const newFileName = `${newId}_${strategy.name.toLowerCase()}_mutated.json`;
  const newPath = path.join(path.dirname(strategyPath), newFileName);
  fs.writeFileSync(newPath, JSON.stringify(strategy, null, 2));
  
  // console.log(`[MUTATOR] Created ${newId} – mutated ${mutationTarget.path}: ${originalValue} → ${newValue}`);
  
  sendMessage('auditor', 'AUDIT_REQUEST', {
    strategyId: newId,
    strategyPath: newPath,
    parentId: strategy.scp_id,
    mutation: { path: mutationTarget.path, old: originalValue, new: newValue }
  });
  
  process.exit(0);
}

mutateStrategy();

// Track mutation entropy
let mutationEntropy = 0;

function updateEntropy(delta) {
  mutationEntropy = Math.min(0.7, Math.max(0, mutationEntropy + delta));
  if (mutationEntropy > 0.7) {
    // console.log(`[MUTATOR] Entropy threshold exceeded (${mutationEntropy}) - resetting`);
    mutationEntropy = 0;
  }
  return mutationEntropy;
}

module.exports.updateEntropy = updateEntropy;

// Real entropy calculation based on mutation magnitude
function calculateMutationEntropy(original, mutated) {
  let changes = 0;
  let totalFields = 0;
  
  function compareObjects(obj1, obj2, path = '') {
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
    for (const key of allKeys) {
      totalFields++;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];
      
      if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        compareObjects(val1, val2, `${path}.${key}`);
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes++;
      }
    }
  }
  
  compareObjects(original, mutated);
  const entropy = totalFields > 0 ? changes / totalFields : 0;
  return Math.min(0.7, entropy);
}

// Report entropy to observability
const { logBreach } = require('../shared/observability_client');

function reportEntropy(strategyId, entropy) {
  if (entropy > 0.3) {
    logBreach('ENTROPY_DRIFT', `Strategy ${strategyId} entropy: ${entropy.toFixed(2)}`, 'mutator');
  }
  return entropy;
}

module.exports.calculateMutationEntropy = calculateMutationEntropy;
module.exports.reportEntropy = reportEntropy;
