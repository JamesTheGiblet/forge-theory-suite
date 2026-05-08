const express = require('express');
const router = express.Router();

// Store for arbitrage opportunities (would be connected to agent)
let opportunities = [];

// Get all opportunities
router.get('/opportunities', (req, res) => {
  res.json({
    count: opportunities.length,
    opportunities: opportunities.slice(-20) // Last 20
  });
});

// Get latest prices (mock for now)
router.get('/prices', async (req, res) => {
  const { getCurrentPrice } = require('../shared/kraken_adapter.js');
  const pairs = ['ETH/USD', 'SOL/USD', 'XRP/USD', 'LINK/USD'];
  const prices = {};
  
  for (const pair of pairs) {
    const price = await getCurrentPrice(pair);
    if (price) prices[pair] = price;
  }
  
  res.json({ timestamp: Date.now(), prices });
});

// Add opportunity (called by agent)
router.post('/opportunity', (req, res) => {
  const opp = req.body;
  opp.timestamp = Date.now();
  opportunities.push(opp);
  res.json({ success: true });
});

module.exports = router;
