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

// ============ EXISTING ENDPOINTS ============
app.get('/api/status', (req, res) => {
  res.json({
    scp_id: 'LEGION-MK2-SCP',
    version: 'MK2.0',
    object_class: 'Thaumiel',
    entropy: 0.1,
    threshold: 0.7,
    agents: 31,
    paper_mode: 'RUNNING'
  });
});

app.get('/api/agents', (req, res) => {
  try {
    const scp = JSON.parse(fs.readFileSync('./scp/SCP.json', 'utf8'));
    res.json(scp.agents.map(a => ({ name: a.name, class: a.object_class, enabled: true, type: a.type })));
  } catch(e) {
    res.json([]);
  }
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
      const records = Object.entries(index).map(([id, data]) => ({
        scp_id: id,
        name: data.name,
        class: data.class,
        fingerprint: data.fingerprint
      }));
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

// ============ NEW FORGE INTEGRATION ENDPOINTS ============
app.post('/api/strategies/rate', (req, res) => {
  const { strategyId, rating } = req.body;
  if (!strategyId || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const indexPath = './data/strategy_index.json';
  if (!fs.existsSync(indexPath)) {
    return res.status(404).json({ error: 'No strategies' });
  }
  let index = {};
  try {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
  const strategy = index[strategyId];
  if (!strategy) {
    return res.status(404).json({ error: 'Strategy not found' });
  }
  strategy.userRating = rating;
  strategy.userRatingTimestamp = Date.now();
  const marketScore = strategy.fitness || 0.5;
  const newFitness = marketScore * 0.8 + (rating / 5) * 0.2;
  strategy.fitness = newFitness;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  res.json({ success: true, newFitness });
});

app.get('/api/strategies/gallery', (req, res) => {
  const indexPath = './data/strategy_index.json';
  if (!fs.existsSync(indexPath)) {
    return res.json([]);
  }
  let index = {};
  try {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
  const strategies = Object.entries(index).map(([id, data]) => ({
    id,
    name: data.name,
    class: data.class,
    fitness: data.fitness || 0,
    userRating: data.userRating || 0,
    lineage: data.lineage || {},
    fingerprint: data.fingerprint
  }));
  strategies.sort((a, b) => b.fitness - a.fitness);
  res.json(strategies.slice(0, 20));
});

app.post('/api/strategies/breed', (req, res) => {
  const { parentA_id, parentB_id } = req.body;
  const indexPath = './data/strategy_index.json';
  if (!fs.existsSync(indexPath)) {
    return res.status(404).json({ error: 'No strategies' });
  }
  let index = {};
  try {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
  const parentA = index[parentA_id];
  const parentB = index[parentB_id];
  if (!parentA || !parentB) {
    return res.status(404).json({ error: 'Parent not found' });
  }
  const child = {
    name: `${parentA.name} × ${parentB.name}`,
    object_class: (parentA.class === 'Keter' || parentB.class === 'Keter') ? 'Keter' : 'Euclid',
    fingerprint: (parentA.fingerprint || '') + (parentB.fingerprint || ''),
    lineage: {
      parents: [parentA_id, parentB_id],
      generation: Math.max(parentA.lineage?.generation || 0, parentB.lineage?.generation || 0) + 1,
      timestamp: Date.now()
    },
    fitness: (parentA.fitness + parentB.fitness) / 2,
    created_at: new Date().toISOString()
  };
  child.fingerprint = child.fingerprint.substring(0, 16);
  const newId = `BRED-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  index[newId] = child;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  res.json({ success: true, child: { id: newId, ...child } });
});

app.get('/api/strategies/patterns', (req, res) => {
  const indexPath = './data/strategy_index.json';
  if (!fs.existsSync(indexPath)) {
    return res.json({ patterns: {}, sampleSize: 0 });
  }
  let index = {};
  try {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
  const strategies = Object.values(index).sort((a, b) => (b.fitness || 0) - (a.fitness || 0)).slice(0, 50);
  const patternCounts = {};
  for (const s of strategies) {
    patternCounts[s.class] = (patternCounts[s.class] || 0) + 1;
  }
  const patterns = Object.fromEntries(
    Object.entries(patternCounts).map(([k, v]) => [k, { count: v, ratio: v / strategies.length }])
  );
  res.json({ patterns, sampleSize: strategies.length });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', intelligence: 'active', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║         LEGION MK2 — Unified Intelligence Server                ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`   Agents: 31 defined`);
  console.log(`   Forge integration endpoints: /api/strategies/rate, /api/strategies/gallery, /api/strategies/breed, /api/strategies/patterns`);
});
