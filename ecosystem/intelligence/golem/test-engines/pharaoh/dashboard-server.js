const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.static(__dirname));

app.get('/api/status', (req, res) => {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/pharaoh-state.json')));
    const prices = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/xrp-price-history.json')));
    const latest = prices[prices.length - 1];
    res.json({
      ...state,
      xrpPrice: latest?.price || 0,
      nextCheck: new Date(Date.now() + 6 * 3600000).toISOString()
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/history', (req, res) => {
  try {
    const h = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/pharaoh-history.json')));
    res.json(h);
  } catch(e) { res.json([]); }
});

app.listen(3005, () => console.log('🏺 Pharaoh dashboard: http://localhost:3005'));
