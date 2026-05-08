const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { IntelligenceIntegration } = require('./core/intelligence_integration');

const app = express();
const PORT = 3011;

app.use(cors());
app.use(express.json());

// Initialize Intelligence
console.log('\n🧠 Loading Intelligence Models...\n');
const intelligence = new IntelligenceIntegration();
const status = intelligence.getStatus();

console.log(`   🦎 Chameleon LM: ${status.chameleon.accuracy}% accuracy (${status.chameleon.interactions} memories)`);
console.log(`   🧠 DQN Trader: ${status.dqn.validation_roi || 0}% validation ROI`);
console.log(`   📈 LSTM Predictor: ${status.lstm.accuracy_1h}% 1h accuracy`);

app.locals.intelligence = intelligence;

// Initialize Strategy Generator
let strategyGenerator = null;
try {
  const { StrategyGenerator } = require('./agents/strategy_generator');
  strategyGenerator = new StrategyGenerator({}, null);
  strategyGenerator.start();
  app.locals.strategyGenerator = strategyGenerator;
  console.log('🧠 Strategy Generator initialized\n');
} catch(e) {
  console.log('⚠️ Strategy Generator not available\n');
}

// Librarian - index strategies manually
function indexStrategies() {
  const strategiesDir = './data/strategies';
  const indexPath = './data/strategy_index.json';
  const crypto = require('crypto');
  
  if (!fs.existsSync(strategiesDir)) return {};
  const files = fs.readdirSync(strategiesDir).filter(f => f.endsWith('.json'));
  const index = {};
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(strategiesDir, file), 'utf8');
      const strategy = JSON.parse(content);
      const { scp_id, parent, mutated_by, generation, created_at, last_modified, addendum_log, lineage, backtest, ...core } = strategy;
      const coreString = JSON.stringify(core);
      const fingerprint = crypto.createHash('sha256').update(coreString).digest('hex').substring(0, 16);
      index[strategy.scp_id] = { file, name: strategy.name, class: strategy.object_class, fingerprint, last_seen: new Date().toISOString() };
    } catch(e) {}
  }
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  return index;
}

// Run initial index
indexStrategies();
setInterval(indexStrategies, 60000);

// ============ API ENDPOINTS ============
app.get('/api/status', (req, res) => {
  res.json({
    scp_id: 'LEGION-MK2-SCP', version: 'MK2.0', object_class: 'Thaumiel',
    entropy: 0.1, threshold: 0.7, agents: 31, paper_mode: 'RUNNING'
  });
});

app.get('/api/agents', (req, res) => {
  const agents = JSON.parse(fs.readFileSync('./scp/SCP.json', 'utf8')).agents;
  res.json(agents.map(a => ({ name: a.name, class: a.object_class, enabled: true, type: a.type })));
});

app.get('/api/entropy', (req, res) => {
  res.json({ entropy: 0.1, threshold: 0.7, status: 'NORMAL' });
});

app.get('/api/intelligence/status', (req, res) => {
  res.json(app.locals.intelligence.getStatus());
});

app.post('/api/intelligence/chat', async (req, res) => {
  const response = await app.locals.intelligence.getChameleonResponse(req.body.message);
  res.json({ response });
});

app.get('/api/librarian/records', (req, res) => {
  try {
    const indexPath = './data/strategy_index.json';
    if (fs.existsSync(indexPath)) {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const records = Object.entries(index).map(([id, data]) => ({ scp_id: id, name: data.name, class: data.class, fingerprint: data.fingerprint }));
      res.json({ count: records.length, records });
    } else {
      res.json({ count: 0, records: [] });
    }
  } catch(e) {
    res.json({ count: 0, records: [] });
  }
});

app.get('/api/strategies/obscure', (req, res) => {
  if (app.locals.strategyGenerator) {
    res.json(app.locals.strategyGenerator.getStatus());
  } else {
    res.json({ generated_count: 0, recent_generated: [] });
  }
});

app.get('/api/arbitrage/prices', (req, res) => {
  res.json({ prices: { 'BTC/USD': 52800, 'ETH/USD': 3150, 'SOL/USD': 88.5 } });
});

app.get('/api/fear-greed', (req, res) => {
  res.json({ current: { value: 45, classification: 'Fear' } });
});

app.listen(PORT, () => {
  console.log(`\n🚀 LEGION Server running on port ${PORT}`);
  console.log(`   Agents: 31 defined`);
  console.log(`   Librarian active`);
  console.log(`   Strategy Generator: ${strategyGenerator ? 'ON' : 'OFF'}`);
});
