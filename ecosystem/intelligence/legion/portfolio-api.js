const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

app.use(express.json());
app.use(require('cors')());

const TRADES_LOG = path.join(__dirname, 'data/real_trades.json');
const PAPER_LOG = path.join(__dirname, 'data/paper_mode.log');

// Initialize real trades file if not exists
if (!fs.existsSync(TRADES_LOG)) {
  fs.writeFileSync(TRADES_LOG, JSON.stringify([], null, 2));
}

function getRealTrades() {
  try {
    const trades = JSON.parse(fs.readFileSync(TRADES_LOG, 'utf8'));
    return trades.slice(-100); // Last 100 trades
  } catch {
    return [];
  }
}

function getPaperTrades() {
  try {
    if (!fs.existsSync(PAPER_LOG)) return [];
    const content = fs.readFileSync(PAPER_LOG, 'utf8');
    const lines = content.split('\n').filter(l => l.includes('EXECUTED'));
    return lines.slice(-50).map(line => {
      const match = line.match(/(\d{4}-\d{2}-\d{2}T[\d:\.]+Z).*(\w+).*(\d+\.?\d*).*@.*\$(\d+\.?\d*)/);
      if (match) {
        return { timestamp: match[1], action: match[2], amount: parseFloat(match[3]), price: parseFloat(match[4]) };
      }
      return null;
    }).filter(t => t);
  } catch {
    return [];
  }
}

app.get('/api/portfolio/metrics', (req, res) => {
  const realTrades = getRealTrades();
  const paperTrades = getPaperTrades();
  
  res.json({
    mode: process.env.LIVE_TRADING === 'true' ? 'LIVE' : 'PAPER',
    real_trades_count: realTrades.length,
    paper_trades_count: paperTrades.length,
    last_real_trade: realTrades[realTrades.length - 1] || null,
    last_paper_trade: paperTrades[paperTrades.length - 1] || null,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/portfolio/trade', (req, res) => {
  const { action, amount, price, asset } = req.body;
  const trades = getRealTrades();
  trades.push({
    timestamp: new Date().toISOString(),
    action,
    amount,
    price,
    asset,
    source: req.body.source || 'manual'
  });
  fs.writeFileSync(TRADES_LOG, JSON.stringify(trades, null, 2));
  res.json({ success: true, trade: trades[trades.length - 1] });
});

app.listen(PORT, () => {
  console.log(`📊 Portfolio API running on port ${PORT} (no mocks)`);
});
