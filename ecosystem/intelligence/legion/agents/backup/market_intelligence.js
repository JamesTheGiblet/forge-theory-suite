const fs = require('fs');
const path = require('path');
const { registerHandler, sendMessage } = require('../bus/router');
const { getCandles, getCurrentPrice } = require('../shared/kraken_adapter');
const { CustomOnChainAnalyzer } = require('../shared/custom_onchain');
const { CryptoVIX } = require('../shared/crypto_vix');

const STATE_FILE = path.join(__dirname, '../data/market_intel.json');

let analyzer = new CustomOnChainAnalyzer();
let vix = new CryptoVIX();
let state = {
  lastScan: null,
  whaleDetections: [],
  vixReadings: {},
  alerts: {}
};

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // console.log('[INTEL] Loaded state');
    } catch (e) { // console.log('[INTEL] New state'); }
  }
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function scanMarket() {
  // console.log('[INTEL] Scanning market for whale activity and volatility...');
  
  const assets = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'LINK/USD', 'LTC/USD', 'DOGE/USD'];
  const detections = [];
  const vixReadings = [];
  
  for (const asset of assets) {
    const candles = getCandles(asset, 100);
    if (!candles || candles.length < 50) continue;
    
    // Whale detection
    const volumeSpike = analyzer.detectWhaleFromCandles(candles, asset);
    if (volumeSpike && volumeSpike.detected) {
      detections.push(volumeSpike);
    }
    
    const accumulation = analyzer.detectAccumulation(candles, asset);
    if (accumulation && accumulation.detected) {
      detections.push(accumulation);
    }
    
    const distribution = analyzer.detectDistribution(candles, asset);
    if (distribution && distribution.detected) {
      detections.push(distribution);
    }
    
    // VIX calculation
    const vixValue = vix.calculateVIX(asset, candles);
    if (vixValue) {
      vixReadings.push({ asset, vix: vixValue.toFixed(1), level: vix.getVIXLevel(vixValue) });
    }
  }
  
  // Store results
  state.lastScan = Date.now();
  state.whaleDetections = detections;
  state.vixReadings = vixReadings;
  saveState();
  
  // Send alerts for new detections
  for (const detection of detections) {
    const alertKey = `${detection.type}_${detection.asset}_${Math.floor(Date.now() / 3600000)}`;
    if (!state.alerts[alertKey]) {
      state.alerts[alertKey] = Date.now();
      saveState();
      
      sendMessage('diplomat', 'WHALE_DETECTION', detection);
    }
  }
  
  // Send VIX summary
  const avgVix = vixReadings.reduce((sum, r) => sum + parseFloat(r.vix), 0) / vixReadings.length;
  sendMessage('diplomat', 'VIX_SUMMARY', { readings: vixReadings, avgVix: avgVix.toFixed(1), timestamp: Date.now() });
  
  // console.log(`[INTEL] Found ${detections.length} anomalies, VIX avg: ${avgVix.toFixed(1)}`);
}

async function startMarketIntel() {
  loadState();
  // console.log('[INTEL] Ready – scanning every 15 minutes');
  
  await scanMarket();
  
  setInterval(async () => {
    await scanMarket();
  }, 15 * 60 * 1000);
  
  registerHandler('SCAN_MARKET', async () => {
    await scanMarket();
  });
}

module.exports = { startMarketIntel, scanMarket };
