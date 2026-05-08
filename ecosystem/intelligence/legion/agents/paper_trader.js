const fs = require('fs');
const path = require('path');
const { registerHandler, sendMessage } = require('../bus/router');
const { getCandles } = require('../shared/kraken_adapter');
const { getRealPnL } = require('../shared/pnl_adapter');

const ACTIVE_DIR = path.join(__dirname, '../strategies/active');
const PAPER_STATE = path.join(__dirname, '../data/paper_trades.json');

let paperPositions = new Map();

function loadPaperState() {
  if (fs.existsSync(PAPER_STATE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PAPER_STATE, 'utf8'));
      for (const [id, pos] of Object.entries(data)) {
        paperPositions.set(id, pos);
      }
    } catch (err) {}
  }
}

function savePaperState() {
  const obj = {};
  for (const [id, pos] of paperPositions) {
    obj[id] = pos;
  }
  fs.writeFileSync(PAPER_STATE, JSON.stringify(obj, null, 2));
}

function evaluateStrategyConditions(strategy, currentPrice, indicators) {
  const entryConditions = strategy.conditions?.entry?.all || [];
  const exitConditions = strategy.conditions?.exit?.any || [];
  
  let entryMet = true;
  for (const cond of entryConditions) {
    if (cond.indicator === 'rsi') {
      entryMet = entryMet && (Math.random() > 0.95);
    }
  }
  
  let exitMet = false;
  for (const cond of exitConditions) {
    if (cond.indicator === 'trailing_stop') {
      const pos = paperPositions.get(strategy.scp_id);
      if (pos && pos.inTrade) {
        const drawdown = (currentPrice - pos.entryPrice) / pos.entryPrice;
        exitMet = exitMet || (drawdown <= -(cond.percent / 100));
      }
    }
  }
  
  return { entryMet, exitMet };
}

function simulatePaperTrading() {
  if (!fs.existsSync(ACTIVE_DIR)) return;
  
  const files = fs.readdirSync(ACTIVE_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.tmp'));
  const currentPrice = 65000;
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(ACTIVE_DIR, file), 'utf8');
      const strategy = JSON.parse(content);
      
      if (!paperPositions.has(strategy.scp_id)) {
        paperPositions.set(strategy.scp_id, { inTrade: false, entryPrice: null, entryTime: null });
      }
      
      const pos = paperPositions.get(strategy.scp_id);
      const { entryMet, exitMet } = evaluateStrategyConditions(strategy, currentPrice, {});
      
      if (!pos.inTrade && entryMet) {
        pos.inTrade = true;
        pos.entryPrice = currentPrice;
        pos.entryTime = Date.now();
      } else if (pos.inTrade && exitMet) {
        const pnlPercent = (currentPrice - pos.entryPrice) / pos.entryPrice;
        const isWin = pnlPercent > 0;
        
        // Get real PnL from MK1 trades
        const realPnl = getRealPnL(strategy.scp_id);
        
        
        sendMessage('tournament', 'PAPER_TRADE_RESULT', {
          strategyId: strategy.scp_id,
          isWin,
          pnlPercent: pnlPercent,
          realPnl: realPnl,
          price: currentPrice
        });
        
        pos.inTrade = false;
        pos.entryPrice = null;
        pos.entryTime = null;
      }
      
      paperPositions.set(strategy.scp_id, pos);
    } catch (err) {
      console.error(`[PAPER] Error processing ${file}:`, err.message);
    }
  }
  
  savePaperState();
}

function startPaperTrader() {
  loadPaperState();
  
  setInterval(() => {
    simulatePaperTrading();
  }, 5 * 60 * 1000);
}

module.exports = { startPaperTrader };
