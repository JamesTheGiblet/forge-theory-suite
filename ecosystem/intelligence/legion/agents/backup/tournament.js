const fs = require('fs');
const path = require('path');
const { registerHandler, sendMessage } = require('../bus/router');
const { getRealPnL } = require('../shared/pnl_adapter');

const TOURNAMENT_STATE = path.join(__dirname, '../data/tournament.json');
const ACTIVE_DIR = path.join(__dirname, '../strategies/active');

const TOURNAMENT_DURATION_HOURS = 24;
const PAPER_CAPITAL = 10000;
const PROMOTION_THRESHOLD = 0.05;
const DEMOTION_THRESHOLD = -0.03;
const MAX_STRATEGIES_IN_TOURNAMENT = 10;

let tournament = {
  active: [],
  standings: {},
  history: [],
  currentStart: Date.now()
};

function loadTournament() {
  if (fs.existsSync(TOURNAMENT_STATE)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(TOURNAMENT_STATE, 'utf8'));
      tournament.active = loaded.active || [];
      tournament.standings = loaded.standings || {};
      tournament.history = loaded.history || [];
      tournament.currentStart = loaded.currentStart || Date.now();
      // console.log(`[TOURNAMENT] Loaded ${tournament.active.length} active contestants`);
    } catch (err) {
      console.error('[TOURNAMENT] Failed to load state:', err.message);
    }
  }
}

function saveTournament() {
  fs.writeFileSync(TOURNAMENT_STATE, JSON.stringify(tournament, null, 2));
}

function addToTournament(strategyId, strategy) {
  if (tournament.active.includes(strategyId)) return false;
  if (tournament.active.length >= MAX_STRATEGIES_IN_TOURNAMENT) {
    removeWorstPerformer();
  }
  
  tournament.active.push(strategyId);
  tournament.standings[strategyId] = {
    pnl: 0,
    realPnl: 0,
    winRate: 0,
    trades: 0,
    startTime: Date.now(),
    allocation: PAPER_CAPITAL,
    name: strategy.name || strategyId,
    class: strategy.object_class || 'Unknown',
    lastPrice: null
  };
  
  saveTournament();
  // console.log(`[TOURNAMENT] Added ${strategyId} to tournament (${tournament.active.length}/${MAX_STRATEGIES_IN_TOURNAMENT})`);
  return true;
}

function removeFromTournament(strategyId, reason) {
  const index = tournament.active.indexOf(strategyId);
  if (index !== -1) {
    tournament.active.splice(index, 1);
    const finalPnl = tournament.standings[strategyId]?.pnl || 0;
    const finalRealPnl = tournament.standings[strategyId]?.realPnl || 0;
    // console.log(`[TOURNAMENT] Removed ${strategyId}: ${reason}`);
    
    tournament.history.push({
      strategyId,
      name: tournament.standings[strategyId]?.name,
      finalPnl,
      finalRealPnl,
      reason,
      endTime: Date.now()
    });
    
    delete tournament.standings[strategyId];
    saveTournament();
  }
}

function removeWorstPerformer() {
  if (tournament.active.length === 0) return;
  
  let worstId = null;
  let worstPnl = Infinity;
  
  for (const id of tournament.active) {
    const pnl = tournament.standings[id]?.pnl || 0;
    if (pnl < worstPnl) {
      worstPnl = pnl;
      worstId = id;
    }
  }
  
  if (worstId) {
    removeFromTournament(worstId, `Worst performer (PnL: ${(worstPnl*100).toFixed(1)}%)`);
  }
}

function updateStanding(strategyId, tradeResult) {
  if (!tournament.standings[strategyId]) {
    // console.log(`[TOURNAMENT] Strategy ${strategyId} not in tournament, skipping update`);
    return;
  }
  
  const standing = tournament.standings[strategyId];
  const { isWin, pnlPercent, realPnl, price } = tradeResult;
  
  standing.pnl = (standing.pnl || 0) + pnlPercent;
  standing.realPnl = realPnl !== undefined ? realPnl : standing.realPnl;
  standing.trades = (standing.trades || 0) + 1;
  standing.lastPrice = price;
  
  const wins = (standing.winRate * (standing.trades - 1)) + (isWin ? 1 : 0);
  standing.winRate = wins / standing.trades;
  
  saveTournament();
  // console.log(`[TOURNAMENT] Updated ${strategyId}: PnL=${(standing.pnl*100).toFixed(1)}%, Real=${(standing.realPnl*100).toFixed(1)}%, Trades=${standing.trades}`);
  
  if (standing.pnl >= PROMOTION_THRESHOLD) {
    sendMessage('treasurer', 'PROMOTE_STRATEGY', { strategyId, pnl: standing.pnl, realPnl: standing.realPnl });
    standing.pnl = 0;
    // console.log(`[TOURNAMENT] ${strategyId} promoted!`);
  }
  
  if (standing.pnl <= DEMOTION_THRESHOLD) {
    removeFromTournament(strategyId, `Failed to meet minimum return (${(standing.pnl*100).toFixed(1)}%)`);
  }
}

function getLeaderboard() {
  const leaderboard = [];
  for (const id of tournament.active) {
    const standing = tournament.standings[id];
    if (standing) {
      leaderboard.push({
        strategyId: id,
        name: standing.name,
        pnl: standing.pnl,
        realPnl: standing.realPnl,
        winRate: standing.winRate,
        trades: standing.trades,
        class: standing.class
      });
    }
  }
  leaderboard.sort((a, b) => b.realPnl - a.realPnl);
  return leaderboard;
}

function printLeaderboard() {
  const leaderboard = getLeaderboard();
  // console.log('\n[TOURNAMENT] ========== LEADERBOARD ==========');
  // console.log('[TOURNAMENT] Real PnL from MK1 trades (not simulated)');
  if (leaderboard.length === 0) {
    // console.log('[TOURNAMENT] No active strategies in tournament');
  } else {
    for (let i = 0; i < Math.min(5, leaderboard.length); i++) {
      const s = leaderboard[i];
      // console.log(`  ${i+1}. ${s.strategyId} (${s.class}) | Real: ${(s.realPnl*100).toFixed(1)}% | Paper: ${(s.pnl*100).toFixed(1)}% | WR: ${(s.winRate*100).toFixed(0)}%`);
    }
  }
  // console.log('[TOURNAMENT] ==================================\n');
}

function startTournament() {
  loadTournament();
  // console.log(`[TOURNAMENT] Ready – ${tournament.active.length} strategies competing (real PnL tracking enabled)`);
  
  setInterval(() => {
    printLeaderboard();
    // Send to Telegram
  const leaderboard = getLeaderboard();
  sendMessage('tournament', 'TOURNAMENT_LEADERBOARD', { leaderboard });
  }, 60 * 60 * 1000);
  
  registerHandler('KETER_AUTHORISED', (msg) => {
    const { strategyId, strategy } = msg.payload;
    setTimeout(() => {
      addToTournament(strategyId, strategy);
    }, 1000);
  });
  
  registerHandler('PAPER_TRADE_RESULT', (msg) => {
    const { strategyId, isWin, pnlPercent, realPnl, price } = msg.payload;
    updateStanding(strategyId, { isWin, pnlPercent, realPnl, price });
  });
  
  setInterval(() => {
    const elapsed = (Date.now() - tournament.currentStart) / (1000 * 60 * 60);
    if (elapsed >= TOURNAMENT_DURATION_HOURS) {
      // console.log(`[TOURNAMENT] Tournament ended after ${TOURNAMENT_DURATION_HOURS}h`);
      tournament.history.push({
        endTime: Date.now(),
        duration: TOURNAMENT_DURATION_HOURS,
        finalStandings: getLeaderboard()
      });
      tournament.active = [];
      tournament.standings = {};
      tournament.currentStart = Date.now();
      saveTournament();
      // console.log('[TOURNAMENT] New tournament started');
    }
  }, 60 * 60 * 1000);
}

module.exports = { startTournament, addToTournament, getLeaderboard, updateStanding, printLeaderboard, loadTournament };

// Handle adding a new strategy to tournament
registerHandler('ADD_STRATEGY', (msg) => {
  const { strategyId, strategy } = msg.payload;
  if (!strategy) {
    // console.log(`[TOURNAMENT] Cannot add ${strategyId}: strategy data missing`);
    return;
  }
  addToTournament(strategyId, strategy);
});

// Ensure loadTournament is called on start
function loadTournament() {
  if (fs.existsSync(TOURNAMENT_STATE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOURNAMENT_STATE, 'utf8'));
      tournament.active = data.active || [];
      tournament.standings = data.standings || {};
      tournament.history = data.history || [];
      tournament.currentStart = data.currentStart || Date.now();
      // console.log(`[TOURNAMENT] Loaded ${tournament.active.length} active contestants`);
      return true;
    } catch (err) {
      console.error('[TOURNAMENT] Failed to load state:', err.message);
      return false;
    }
  }
  return false;
}

// Call loadTournament at the end of startTournament
// (Find startTournament and add loadTournament call if not present)
