const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3010;

app.use(cors());
app.use(express.json());

const INDEX_PATH = path.join(__dirname, 'data/strategy_index.json');
const CONTAINMENT_LOG = path.join(__dirname, 'data/containment_log.json');

function readJSONSafe(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      return parsed;
    }
  } catch (err) {
    console.error(`[OBSERVABILITY] Error reading ${filePath}:`, err.message);
    // Backup the corrupted file
    if (fs.existsSync(filePath)) {
      const backup = `${filePath}.corrupted.${Date.now()}`;
      fs.copyFileSync(filePath, backup);
      console.log(`[OBSERVABILITY] Backed up corrupted file to ${backup}`);
    }
  }
  return defaultValue;
}

function writeJSONSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`[OBSERVABILITY] Error writing ${filePath}:`, err.message);
    return false;
  }
}

app.get('/api', (req, res) => {
  res.json({
    name: 'LEGION Observability API',
    endpoints: [
      'GET  /api',
      'GET  /api/entropy',
      'GET  /api/librarian/records',
      'GET  /api/reaper/stats',
      'GET  /api/apollyon/events',
      'POST /api/apollyon/breach',
      'POST /api/reset',
      'GET  /api/observability/health'
    ]
  });
});

app.get('/api/librarian/records', (req, res) => {
  const index = readJSONSafe(INDEX_PATH, {});
  const records = Object.entries(index).map(([id, data]) => ({
    scp_id: id,
    name: data.name,
    class: data.class,
    fingerprint: data.fingerprint,
    last_seen: data.last_seen,
    file: data.file
  }));
  res.json({ count: records.length, records });
});

app.get('/api/entropy', (req, res) => {
  const log = readJSONSafe(CONTAINMENT_LOG, []);
  const breaches = log.length;
  const entropyValue = Math.min(breaches / 10, 0.7);
  
  res.json({
    system: {
      current: entropyValue,
      threshold: 0.7,
      status: entropyValue > 0.6 ? 'Keter' : entropyValue > 0.3 ? 'Euclid' : 'Safe'
    },
    breaches_count: breaches,
    note: breaches === 0 ? 'No breaches. System stable.' : `${breaches} breach(es) detected.`
  });
});

app.get('/api/reaper/stats', (req, res) => {
  res.json({
    implemented: false,
    message: 'Reaper agent not yet deployed',
    zombies_killed: 0
  });
});

app.get('/api/apollyon/events', (req, res) => {
  const log = readJSONSafe(CONTAINMENT_LOG, []);
  const limit = parseInt(req.query.limit) || 50;
  const events = log.slice(-limit);
  res.json({ count: events.length, events });
});

app.post('/api/apollyon/breach', (req, res) => {
  const log = readJSONSafe(CONTAINMENT_LOG, []);
  const breach = {
    timestamp: new Date().toISOString(),
    type: req.body.type || 'MANUAL_BREACH',
    message: req.body.message || 'Manual breach event',
    source: req.body.source || 'observability-api'
  };
  log.push(breach);
  writeJSONSafe(CONTAINMENT_LOG, log);
  res.json({ success: true, breach });
});

app.post('/api/reset', (req, res) => {
  const target = req.body.target || 'apollyon';
  
  if (target === 'apollyon') {
    writeJSONSafe(CONTAINMENT_LOG, []);
    res.json({ success: true, message: 'Containment log cleared', reset: 'apollyon' });
  } else {
    res.json({ success: false, message: `Unknown target: ${target}` });
  }
});

app.get('/api/observability/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), port: PORT });
});

app.listen(PORT, () => {
  console.log(`🔭 Observability API running on port ${PORT}`);
});
