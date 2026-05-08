const express = require('express');
const router = express.Router();

// Get intelligence status
router.get('/intelligence/status', (req, res) => {
  if (!global.intelligence) {
    return res.status(503).json({ error: 'Intelligence not initialized' });
  }
  res.json(global.intelligence.getStatus());
});

// Chat with Chameleon
router.post('/intelligence/chat', async (req, res) => {
  const { message, context } = req.body;
  if (!global.intelligence) {
    return res.status(503).json({ error: 'Intelligence not initialized' });
  }
  const response = await global.intelligence.getChameleonResponse(message, context);
  res.json({ response });
});

// Get DQN trading decision
router.post('/intelligence/trade', (req, res) => {
  const { market_data } = req.body;
  if (!global.intelligence) {
    return res.status(503).json({ error: 'Intelligence not initialized' });
  }
  const decision = global.intelligence.getDQNAction(market_data);
  res.json(decision);
});

// Get LSTM price prediction
router.post('/intelligence/predict', (req, res) => {
  const { current_price, lookback } = req.body;
  if (!global.intelligence) {
    return res.status(503).json({ error: 'Intelligence not initialized' });
  }
  const prediction = global.intelligence.getLSTMPrediction(current_price, lookback);
  res.json(prediction);
});

module.exports = router;
