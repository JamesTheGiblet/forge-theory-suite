const { sendMessage } = require('../bus/router');
const fs = require('fs');
const path = require('path');

class Mutator {
  constructor() {
    this.id = `Mutator_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  mutate(strategy) {
    if (!strategy) {
      console.log(`[MUTATOR] No strategy to mutate`);
      return null;
    }
    
    // Create deep copy
    const mutated = JSON.parse(JSON.stringify(strategy));
    
    // Generate new ID
    mutated.scp_id = `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    mutated.name = strategy.name || "Auto Generated";
    mutated.lineage = mutated.lineage || {};
    mutated.lineage.parent = strategy.scp_id;
    mutated.lineage.generation = (strategy.lineage?.generation || 0) + 1;
    mutated.lineage.mutated_by = this.id;
    
    // Mutate a random parameter
    const mutationTargets = [
      { path: ['conditions', 'entry', 'all', 0, 'value'], range: [20, 40] },
      { path: ['containment_procedures', 'max_drawdown_pct'], range: [3, 8] },
      { path: ['risk', 'position_size'], values: ['0.005', '0.01', '0.015', '0.02'] }
    ];
    
    const target = mutationTargets[Math.floor(Math.random() * mutationTargets.length)];
    let current = mutated;
    
    // Navigate to the target
    for (let i = 0; i < target.path.length - 1; i++) {
      if (!current[target.path[i]]) current[target.path[i]] = {};
      current = current[target.path[i]];
    }
    
    const lastKey = target.path[target.path.length - 1];
    const oldValue = current[lastKey];
    
    if (target.range) {
      current[lastKey] = Math.floor(Math.random() * (target.range[1] - target.range[0] + 1) + target.range[0]);
    } else if (target.values) {
      current[lastKey] = target.values[Math.floor(Math.random() * target.values.length)];
    }
    
    console.log(`[MUTATOR] Created ${mutated.scp_id} – mutated ${target.path.join('.')}: ${oldValue} → ${current[lastKey]}`);
    
    return mutated;
  }
}

function mutateStrategy() {
  const mutator = new Mutator();
  // This function is called by forge_lord
  return mutator;
}

module.exports = { Mutator, mutateStrategy };
