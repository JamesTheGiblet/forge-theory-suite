const fs = require('fs');
const path = require('path');
const { registerHandler, sendMessage } = require('../bus/router');

const STATE_FILE = path.join(__dirname, '../data/treasurer_state.json');

const DEFAULT_POSITION_SIZE = 100;
const MAX_POSITION_SIZE = 500;
const MIN_POSITION_SIZE = 25;
const LOSS_STREAK_TO_PAUSE = 3;
const WIN_STREAK_TO_INCREASE = 5;
const PAUSE_DURATION_HOURS = 24;

let strategyStates = new Map();

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      for (const [id, state] of Object.entries(data)) {
        strategyStates.set(id, state);
      }
    } catch (err) {}
  }
}

function saveState() {
  const obj = {};
  for (const [id, state] of strategyStates) {
    obj[id] = state;
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2));
}

function getStrategyState(strategyId) {
  if (!strategyStates.has(strategyId)) {
    strategyStates.set(strategyId, {
      wins: 0,
      losses: 0,
      pausedUntil: null,
      positionSize: DEFAULT_POSITION_SIZE
    });
  }
  return strategyStates.get(strategyId);
}

function recordTradeResult(strategyId, isWin) {
  const state = getStrategyState(strategyId);
  
  if (isWin) {
    state.wins++;
    state.losses = 0;
    
    if (state.wins >= WIN_STREAK_TO_INCREASE && state.positionSize < MAX_POSITION_SIZE) {
      state.positionSize = Math.min(state.positionSize * 1.5, MAX_POSITION_SIZE);
      sendMessage('diplomat', 'POSITION_CHANGE', { strategyId, newSize: state.positionSize, reason: `${state.wins} consecutive wins` });
    }
  } else {
    state.losses++;
    state.wins = 0;
    
    if (state.losses >= LOSS_STREAK_TO_PAUSE) {
      state.pausedUntil = Date.now() + (PAUSE_DURATION_HOURS * 60 * 60 * 1000);
      state.positionSize = DEFAULT_POSITION_SIZE;
      sendMessage('diplomat', 'STRATEGY_PAUSED', { strategyId, duration: PAUSE_DURATION_HOURS });
    } else {
      state.positionSize = Math.max(state.positionSize * 0.8, MIN_POSITION_SIZE);
    }
  }
  
  saveState();
}

function isStrategyPaused(strategyId) {
  const state = getStrategyState(strategyId);
  if (state.pausedUntil && Date.now() < state.pausedUntil) return true;
  if (state.pausedUntil && Date.now() >= state.pausedUntil) {
    state.pausedUntil = null;
    state.losses = 0;
    saveState();
  }
  return false;
}

function getPositionSize(strategyId) {
  const state = getStrategyState(strategyId);
  return isStrategyPaused(strategyId) ? 0 : state.positionSize;
}

function startTreasurer() {
  loadState();
  
  registerHandler('TRADE_RESULT', (msg) => {
    const { strategyId, isWin } = msg.payload;
    recordTradeResult(strategyId, isWin);
  });
  
  registerHandler('PROMOTE_STRATEGY', (msg) => {
  });
  
  setInterval(() => {
    let active = 0, paused = 0;
    for (const [id, state] of strategyStates) {
      if (state.pausedUntil && Date.now() < state.pausedUntil) paused++;
      else active++;
    }
  }, 60 * 60 * 1000);
}

module.exports = { startTreasurer, getPositionSize, isStrategyPaused, recordTradeResult };
