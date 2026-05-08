const fs = require('fs');
const path = require('path');
const { registerHandler, sendMessage } = require('../bus/router');

const STATE_FILE = path.join(__dirname, '../data/portfolio_state.json');
const ALLOCATION_HISTORY = path.join(__dirname, '../data/allocation_history.json');

const TOTAL_CAPITAL = 10000;
const MIN_ALLOCATION = 500;
const MAX_ALLOCATION = 3000;
const REBALANCE_INTERVAL = 60 * 60 * 1000;

let portfolio = {
  lastRebalance: Date.now(),
  allocations: new Map(),
  totalAllocated: 0
};

function loadPortfolio() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      portfolio.lastRebalance = data.lastRebalance;
      portfolio.totalAllocated = data.totalAllocated;
      portfolio.allocations.clear();
      for (const [id, alloc] of Object.entries(data.allocations)) {
        portfolio.allocations.set(id, alloc);
      }
      return true;
    } catch (err) {
      console.error('[PORTFOLIO] Failed to load state:', err.message);
      return false;
    }
  }
  return false;
}

function savePortfolio() {
  const data = {
    lastRebalance: portfolio.lastRebalance,
    totalAllocated: portfolio.totalAllocated,
    allocations: Object.fromEntries(portfolio.allocations)
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
}

function logAllocationHistory(action, details) {
  let history = [];
  if (fs.existsSync(ALLOCATION_HISTORY)) {
    history = JSON.parse(fs.readFileSync(ALLOCATION_HISTORY, 'utf8'));
  }
  history.push({
    timestamp: new Date().toISOString(),
    action,
    details
  });
  if (history.length > 1000) history.shift();
  fs.writeFileSync(ALLOCATION_HISTORY, JSON.stringify(history, null, 2));
}

function calculateAllocations(leaderboard) {
  if (leaderboard.length === 0) {
    return new Map();
  }
  
  const sorted = [...leaderboard].sort((a, b) => b.realPnl - a.realPnl);
  const allocations = new Map();
  
  // Equal allocation for all strategies
  const equalShare = Math.floor(TOTAL_CAPITAL / sorted.length);
  for (const strategy of sorted) {
    allocations.set(strategy.strategyId, {
      allocation: Math.min(MAX_ALLOCATION, Math.max(MIN_ALLOCATION, equalShare)),
      rank: sorted.findIndex(s => s.strategyId === strategy.strategyId) + 1,
      pnl: strategy.realPnl,
      winRate: strategy.winRate,
      name: strategy.name,
      class: strategy.class
    });
  }
  
  return allocations;
}

function printPortfolio() {
  
  const sorted = Array.from(portfolio.allocations.entries())
    .sort((a, b) => a[1].rank - b[1].rank);
  
  for (const [id, alloc] of sorted) {
    const emoji = alloc.rank === 1 ? '🏆' : (alloc.rank === 2 ? '🥈' : (alloc.rank === 3 ? '🥉' : '📊'));
    const pnlDisplay = alloc.pnl ? (alloc.pnl > 0 ? `+${(alloc.pnl*100).toFixed(1)}%` : `${(alloc.pnl*100).toFixed(1)}%`) : '0%';
  }
}

async function rebalancePortfolio() {
  
  // Load fresh data first
  loadPortfolio();
  
  const { getLeaderboard } = require('./tournament');
  const leaderboard = getLeaderboard();
  
  
  const newAllocations = calculateAllocations(leaderboard);
  
  if (newAllocations.size === 0) {
    return;
  }
  
  portfolio.allocations = newAllocations;
  portfolio.lastRebalance = Date.now();
  portfolio.totalAllocated = TOTAL_CAPITAL;
  savePortfolio();
  
  printPortfolio();
  
  const topPerformer = Array.from(portfolio.allocations.entries())[0];
  if (topPerformer) {
    sendMessage('diplomat', 'PORTFOLIO_UPDATE', {
      topStrategy: topPerformer[0],
      topAllocation: topPerformer[1].allocation,
      totalStrategies: portfolio.allocations.size,
      totalCapital: TOTAL_CAPITAL
    });
  }
}

function getAllocation(strategyId) {
  // Load fresh data if needed
  if (portfolio.allocations.size === 0) {
    loadPortfolio();
  }
  const alloc = portfolio.allocations.get(strategyId);
  return alloc ? alloc.allocation : MIN_ALLOCATION;
}

function getTopStrategies(limit = 3) {
  // Load fresh data if needed
  if (portfolio.allocations.size === 0) {
    loadPortfolio();
  }
  const sorted = Array.from(portfolio.allocations.entries())
    .sort((a, b) => a[1].rank - b[1].rank);
  return sorted.slice(0, limit).map(([id, data]) => ({ id, ...data }));
}

function startPortfolioAllocator() {
  loadPortfolio();
  
  setTimeout(() => rebalancePortfolio(), 5000);
  setInterval(() => rebalancePortfolio(), REBALANCE_INTERVAL);
  
  registerHandler('TOURNAMENT_LEADERBOARD', () => {
    setTimeout(() => rebalancePortfolio(), 1000);
  });
  
  registerHandler('PAPER_TRADE_RESULT', () => {
    setTimeout(() => rebalancePortfolio(), 5000);
  });
}

module.exports = { startPortfolioAllocator, getAllocation, getTopStrategies, rebalancePortfolio };
