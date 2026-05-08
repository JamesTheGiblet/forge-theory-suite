const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3011;

app.use(cors());
app.use(express.json());

const scpPath = path.join(__dirname, '../scp/SCP.json');
const reportsDir = path.join(__dirname, '../reports');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Status endpoint
app.get('/api/status', (req, res) => {
  try {
    const scp = JSON.parse(fs.readFileSync(scpPath, 'utf8'));
    res.json({
      scp_id: scp.scp_id,
      version: scp.version,
      object_class: scp.object_class,
      entropy: scp.containment?.global_entropy || 0,
      threshold: scp.containment?.threshold || 0.7,
      agents: scp.agents?.filter(a => a.enabled !== false).length || 0,
      paper_mode: scp.paper_mode?.status || 'RUNNING'
    });
  } catch(e) {
    res.json({ error: e.message });
  }
});

// Agents endpoint
app.get('/api/agents', (req, res) => {
  try {
    const scp = JSON.parse(fs.readFileSync(scpPath, 'utf8'));
    res.json(scp.agents?.map(a => ({
      name: a.name,
      class: a.object_class,
      enabled: a.enabled !== false,
      type: a.type
    })) || []);
  } catch(e) {
    res.json([]);
  }
});

// Entropy endpoint
app.get('/api/entropy', (req, res) => {
  try {
    const scp = JSON.parse(fs.readFileSync(scpPath, 'utf8'));
    res.json({
      entropy: scp.containment?.global_entropy || 0,
      threshold: scp.containment?.threshold || 0.7,
      status: scp.containment?.global_entropy > 0.7 ? 'CRITICAL' : 
              scp.containment?.global_entropy > 0.3 ? 'ELEVATED' : 'NORMAL'
    });
  } catch(e) {
    res.json({ entropy: 0, threshold: 0.7, status: 'NORMAL' });
  }
});

// Intelligence endpoints
app.get('/api/intelligence/status', (req, res) => {
  if (!global.intelligence) {
    return res.status(503).json({ error: 'Intelligence not initialized' });
  }
  res.json(global.intelligence.getStatus());
});

app.post('/api/intelligence/chat', async (req, res) => {
  if (!global.intelligence) {
    return res.status(503).json({ error: 'Intelligence not initialized' });
  }
  const response = await global.intelligence.getChameleonResponse(req.body.message, req.body.context);
  res.json({ response });
});

app.post('/api/intelligence/trade', (req, res) => {
  if (!global.intelligence) {
    return res.status(503).json({ error: 'Intelligence not initialized' });
  }
  const decision = global.intelligence.getDQNAction(req.body.market_data);
  res.json(decision);
});

app.post('/api/intelligence/predict', (req, res) => {
  if (!global.intelligence) {
    return res.status(503).json({ error: 'Intelligence not initialized' });
  }
  const prediction = global.intelligence.getLSTMPrediction(req.body.current_price, req.body.lookback);
  res.json(prediction);
});

// Apollyon endpoint
app.get('/api/apollyon', (req, res) => {
  try {
    const scp = JSON.parse(fs.readFileSync(scpPath, 'utf8'));
    res.json({
      events: scp.containment?.apollyon_events || [],
      count: (scp.containment?.apollyon_events || []).length
    });
  } catch(e) {
    res.json({ events: [], count: 0 });
  }
});

// Reports endpoint
app.get('/api/reports', (req, res) => {
  try {
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json')).sort().reverse();
      const reports = files.map(file => ({ filename: file, timestamp: file.replace('report_', '').replace('.json', '') }));
      res.json({ count: reports.length, reports });
    } else {
      res.json({ count: 0, reports: [] });
    }
  } catch(e) {
    res.json({ count: 0, reports: [] });
  }
});

// Arbitrage prices endpoint
app.get('/api/arbitrage/prices', (req, res) => {
  res.json({ prices: { 'BTC/USD': 50000, 'ETH/USD': 3000, 'SOL/USD': 85 } });
});

app.listen(PORT, () => {
  console.log(`[API] SCP-native API on port ${PORT}`);
});
