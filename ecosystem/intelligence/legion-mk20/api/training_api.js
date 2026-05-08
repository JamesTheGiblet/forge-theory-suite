const express = require('express');
const { ChameleonLM } = require('../agents/chameleon_lm');

const router = express.Router();
let chameleon = null;

function getChameleon() {
  if (!chameleon) {
    chameleon = new ChameleonLM({ learning_rate: 0.3, personality: 'adaptive' }, null);
    chameleon.start();
  }
  return chameleon;
}

router.post('/chameleon/chat', async (req, res) => {
  const { message } = req.body;
  const ch = getChameleon();
  const response = await ch.generateResponse(message, {});
  res.json({ response });
});

router.post('/chameleon/feedback', async (req, res) => {
  const { feedback, response } = req.body;
  const ch = getChameleon();
  await ch.learn({ userInput: 'previous', response, context: {} }, feedback);
  await ch.adaptPersonality();
  res.json({ success: true });
});

router.get('/chameleon/status', (req, res) => {
  const ch = getChameleon();
  res.json(ch.getTrainingStatus());
});

module.exports = router;
