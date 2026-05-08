const { log, error, warn, info } = require("./logging");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { registerHandler, sendMessage } = require('../bus/router');

const ACTIVE_DIR = path.join(__dirname, '../strategies/active');
const INDEX_PATH = path.join(__dirname, '../data/strategy_index.json');

function generateFingerprint(strategy) {
  // Create a deep copy
  const core = JSON.parse(JSON.stringify(strategy));
  
  // Remove ONLY pure metadata fields (not trading logic)
  delete core.scp_id;
  delete core.parent;
  delete core.mutated_by;
  delete core.generation;
  delete core.created_at;
  delete core.last_modified;
  delete core.lineage;
  delete core.backtest;  // Backtest results are outputs, not logic
  
  // KEEP containment_procedures (includes max_drawdown_pct)
  // KEEP risk, conditions, asset, timeframe, active_regimes, object_class
  
  // Recursively sort keys for consistent hashing
  const sortKeys = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    return Object.keys(obj).sort().reduce((sorted, key) => {
      sorted[key] = sortKeys(obj[key]);
      return sorted;
    }, {});
  };
  
  const sortedCore = sortKeys(core);
  const coreString = JSON.stringify(sortedCore);
  const hash = crypto.createHash('sha256').update(coreString).digest('hex').substring(0, 16);
  
  return hash;
}

function indexStrategies() {
  if (!fs.existsSync(ACTIVE_DIR)) return {};

  const index = {};
  const files = fs.readdirSync(ACTIVE_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.tmp'));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(ACTIVE_DIR, file), 'utf8');
      const strategy = JSON.parse(content);
      const fingerprint = generateFingerprint(strategy);
      
      index[strategy.scp_id] = {
        file,
        name: strategy.name,
        class: strategy.object_class,
        fingerprint,
        last_seen: new Date().toISOString()
      };
    } catch (err) {
//       console.error(`[LIBRARIAN] Error indexing ${file}:`, err.message);
    }
  }
  
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  
  // Report duplicates
  const fingerprints = {};
  let duplicateCount = 0;
  for (const [id, data] of Object.entries(index)) {
    if (fingerprints[data.fingerprint]) {
      duplicateCount++;
    } else {
      fingerprints[data.fingerprint] = id;
    }
  }
  
  return index;
}

function startLibrarian() {
  indexStrategies();
  setInterval(() => indexStrategies(), 60 * 60 * 1000);
  
  registerHandler('VALIDATION_COMPLETE', (msg) => {
    setTimeout(() => {
      indexStrategies();
      if (msg.payload.objectClass === 'Keter') {
        sendMessage('vote_manager', 'KETER_VOTE_REQUEST', {
          strategyId: msg.payload.strategyId,
          strategy: msg.payload.strategy,
          voter: 'Librarian'
        });
      }
    }, 1000);
  });
  
}

if (require.main === module) {
  startLibrarian();
}

module.exports = { startLibrarian, generateFingerprint };
