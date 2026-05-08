const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../bus/router');
const { getSentiment, refreshSentiment, getSentimentRegime } = require('./sentiment');

const REGIME_FILE = process.env.HOME + '/kraken-intelligence/current_regime.json';
let currentRegime = 'unknown';
let currentSentiment = null;

function detectRegime() {
  // Priority 1: Sentiment-based regime
  if (currentSentiment && currentSentiment.value) {
    const sentimentRegime = getSentimentRegime(currentSentiment.value);
    if (sentimentRegime !== 'neutral') {
      return sentimentRegime;
    }
  }
  
  // Priority 2: File-based regime (fallback)
  if (fs.existsSync(REGIME_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(REGIME_FILE, 'utf8'));
      return data.regime || data.regime_type || 'unknown';
    } catch (err) {
      return 'unknown';
    }
  }
  
  return 'unknown';
}

function broadcastRegimeChange(newRegime) {
  if (newRegime !== currentRegime) {
    console.log(`[REGIME] Change detected: ${currentRegime} → ${newRegime}`);
    if (currentSentiment) {
      console.log(`[REGIME] Sentiment: ${currentSentiment.value} (${currentSentiment.classification})`);
    }
    sendMessage('forge_lord', 'REGIME_CHANGE', { old: currentRegime, new: newRegime });
    sendMessage('necromancer', 'REGIME_CHANGE', { old: currentRegime, new: newRegime });
    sendMessage('diplomat', 'REGIME_CHANGE', { old: currentRegime, new: newRegime });
    currentRegime = newRegime;
  }
}

async function startRegimeWatcher() {
  // Initial sentiment fetch
  await refreshSentiment();
  currentSentiment = getSentiment();
  
  currentRegime = detectRegime();
  console.log(`[REGIME] Initial regime: ${currentRegime}`);
  if (currentSentiment && currentSentiment.value) {
    console.log(`[REGIME] Sentiment: ${currentSentiment.value} (${currentSentiment.classification})`);
  }
  
  // Poll every 5 minutes
  setInterval(async () => {
    await refreshSentiment();
    currentSentiment = getSentiment();
    const newRegime = detectRegime();
    broadcastRegimeChange(newRegime);
  }, 5 * 60 * 1000);
}

function getCurrentRegime() {
  return currentRegime;
}

module.exports = { startRegimeWatcher, getCurrentRegime, detectRegime };
