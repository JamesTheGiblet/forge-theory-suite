const fs = require('fs');
const path = require('path');
const { registerHandler, sendMessage } = require('../bus/router');
const { getWhaleSummary, getExchangeFlows } = require('../shared/onchain');

const STATE_FILE = path.join(__dirname, '../data/whale_state.json');
let lastAlertTime = {};
let whaleState = { lastTxId: null, alerts: [] };

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      whaleState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(whaleState, null, 2));
}

async function checkWhaleActivity() {
  
  const summary = await getWhaleSummary();
  const flows = await getExchangeFlows();
  
  // Check for large single transactions (> $50M)
  if (summary.largestTx && summary.largestTx.amount_usd > 50000000) {
    const txId = summary.largestTx.id;
    if (lastAlertTime[txId] !== txId) {
      lastAlertTime[txId] = txId;
      
      const direction = summary.largestTx.to?.owner_type === 'exchange' ? 'to exchange (sell pressure)' : 'from exchange (accumulation)';
      const emoji = summary.largestTx.to?.owner_type === 'exchange' ? '🔴' : '🟢';
      
      sendMessage('diplomat', 'WHALE_TRANSACTION', {
        emoji,
        symbol: summary.largestTx.symbol,
        amount: summary.largestTx.amount,
        value: summary.largestTx.amount_usd,
        direction,
        from: summary.largestTx.from?.address || 'unknown',
        to: summary.largestTx.to?.address || 'unknown'
      });
    }
  }
  
  // Check exchange flows
  for (const [exchange, flow] of Object.entries(flows)) {
    if (exchange !== 'unknown' && Math.abs(flow.net) > 50000000) {
      const direction = flow.net > 0 ? 'inflow (bearish)' : 'outflow (bullish)';
      const emoji = flow.net > 0 ? '🔴' : '🟢';
      
      const alertKey = `${exchange}_${Math.floor(Date.now() / 3600000)}`;
      if (lastAlertTime[alertKey] !== alertKey) {
        lastAlertTime[alertKey] = alertKey;
        
        sendMessage('diplomat', 'EXCHANGE_FLOW', {
          emoji,
          exchange: exchange.charAt(0).toUpperCase() + exchange.slice(1),
          netFlow: Math.abs(flow.net),
          direction,
          inflow: flow.inflow,
          outflow: flow.outflow
        });
      }
    }
  }
  
  // Store in state
  whaleState.lastCheck = Date.now();
  whaleState.summary = summary;
  saveState();
  
}

async function startWhaleAlert() {
  loadState();
  
  // Initial check
  await checkWhaleActivity();
  
  // Check every 30 minutes
  setInterval(async () => {
    await checkWhaleActivity();
  }, 30 * 60 * 1000);
  
  registerHandler('CHECK_WHALES', async () => {
    await checkWhaleActivity();
  });
}

module.exports = { startWhaleAlert, checkWhaleActivity };
