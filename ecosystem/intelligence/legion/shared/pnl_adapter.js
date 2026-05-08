const fs = require('fs');
const path = require('path');

const MONITOR_LOG = process.env.HOME + '/kraken-intelligence/data/monitor_log.json';

function getRealPnL(strategyId) {
  if (!fs.existsSync(MONITOR_LOG)) return 0;
  const logs = JSON.parse(fs.readFileSync(MONITOR_LOG, 'utf8'));
  const strategyTrades = logs.filter(t => t.strategyId === strategyId);
  const totalPnl = strategyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  return totalPnl;
}

module.exports = { getRealPnL };
