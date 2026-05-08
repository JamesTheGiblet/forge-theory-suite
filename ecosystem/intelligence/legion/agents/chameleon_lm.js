const fs = require('fs');
const path = require('path');
const { registerHandler, sendMessage } = require('../bus/router');

const LINEAGE_HISTORY = path.join(__dirname, '../data/lineage_history.json');

// Thresholds for decision making
const THRASHING_THRESHOLD = 5;      // 5+ failed mutations = thrashing
const EVOLVING_THRESHOLD = 3;       // 3+ successful mutations = evolving
const MIN_SAMPLES = 3;              // Need at least 3 mutations to judge

let lineageHistory = new Map();      // parentId -> { mutations, winRates, status }

function loadLineageHistory() {
  if (fs.existsSync(LINEAGE_HISTORY)) {
    try {
      const data = JSON.parse(fs.readFileSync(LINEAGE_HISTORY, 'utf8'));
      for (const [id, history] of Object.entries(data)) {
        lineageHistory.set(id, history);
      }
    } catch (err) {
      console.error('[CHAMELEON] Failed to load lineage history:', err.message);
    }
  }
}

function saveLineageHistory() {
  const obj = {};
  for (const [id, history] of lineageHistory) {
    obj[id] = history;
  }
  fs.writeFileSync(LINEAGE_HISTORY, JSON.stringify(obj, null, 2));
}

function assessLineage(parentId) {
  const history = lineageHistory.get(parentId);
  if (!history || history.mutations.length < MIN_SAMPLES) {
    return { 
      status: 'insufficient_data', 
      confidence: 0, 
      reason: `Only ${history?.mutations.length || 0}/${MIN_SAMPLES} mutations` 
    };
  }
  
  const recentMutations = history.mutations.slice(-THRASHING_THRESHOLD);
  const recentWins = history.winRates.slice(-THRASHING_THRESHOLD);
  
  const failedCount = recentMutations.filter(m => !m.passed).length;
  const successCount = recentMutations.filter(m => m.passed).length;
  const avgWinRate = recentWins.reduce((a, b) => a + b, 0) / recentWins.length;
  const winRateTrend = calculateTrend(history.winRates);
  
  // Thrashing detection: many failures, declining win rate
  if (failedCount >= THRASHING_THRESHOLD || (failedCount >= 3 && winRateTrend < -0.1)) {
    return { 
      status: 'thrashing', 
      confidence: 0.85, 
      reason: `${failedCount} failures, win rate trend ${(winRateTrend*100).toFixed(0)}%`,
      action: 'HALT_MUTATIONS'
    };
  }
  
  // Evolving detection: many successes, improving win rate
  if (successCount >= EVOLVING_THRESHOLD && avgWinRate > 0.55 && winRateTrend > 0.05) {
    return { 
      status: 'evolving', 
      confidence: 0.8, 
      reason: `${successCount} successes, win rate ${(avgWinRate*100).toFixed(0)}%, trend +${(winRateTrend*100).toFixed(0)}%`,
      action: 'CONTINUE'
    };
  }
  
  // Uncertain: mixed results
  return { 
    status: 'uncertain', 
    confidence: 0.5, 
    reason: `Success:${successCount} Fail:${failedCount}, WR:${(avgWinRate*100).toFixed(0)}%`,
    action: 'CAUTION'
  };
}

function calculateTrend(values) {
  if (values.length < 2) return 0;
  const recent = values.slice(-5);
  const first = recent[0];
  const last = recent[recent.length - 1];
  return (last - first) / (first || 1);
}

function recordMutation(parentId, mutation, backtestResult) {
  if (!lineageHistory.has(parentId)) {
    lineageHistory.set(parentId, { 
      mutations: [], 
      winRates: [], 
      status: 'new',
      createdAt: Date.now()
    });
  }
  
  const history = lineageHistory.get(parentId);
  history.mutations.push({
    timestamp: Date.now(),
    mutationPath: mutation.path,
    oldValue: mutation.old,
    newValue: mutation.new,
    passed: backtestResult.winRate > 0.5,
    winRate: backtestResult.winRate
  });
  history.winRates.push(backtestResult.winRate);
  
  // Keep last 20 mutations only (memory efficiency)
  if (history.mutations.length > 20) history.mutations.shift();
  if (history.winRates.length > 20) history.winRates.shift();
  
  const assessment = assessLineage(parentId);
  history.status = assessment.status;
  history.lastAssessment = assessment;
  
  saveLineageHistory();
  
  
  // Send alerts for thrashing lineages
  if (assessment.status === 'thrashing') {
    sendMessage('forge_lord', 'LINEAGE_THRASHING', { 
      parentId, 
      reason: assessment.reason,
      confidence: assessment.confidence,
      action: assessment.action
    });
    sendMessage('diplomat', 'LINEAGE_THRASHING', { 
      parentId, 
      reason: assessment.reason,
      confidence: assessment.confidence
    });
  } else if (assessment.status === 'evolving') {
    sendMessage('forge_lord', 'LINEAGE_EVOLVING', { 
      parentId, 
      reason: assessment.reason,
      confidence: assessment.confidence
    });
  }
  
  return assessment;
}

function getLineageStatus(parentId) {
  if (!lineageHistory.has(parentId)) return null;
  return {
    parentId,
    status: lineageHistory.get(parentId).status,
    totalMutations: lineageHistory.get(parentId).mutations.length,
    lastAssessment: lineageHistory.get(parentId).lastAssessment
  };
}

function startChameleon() {
  loadLineageHistory();
  
  // Listen for validation results
  registerHandler('VALIDATION_COMPLETE', (msg) => {
    const { parentId, mutation, backtest } = msg.payload;
    if (parentId && parentId !== 'STRAT-000' && mutation) {
      recordMutation(parentId, mutation, backtest);
    }
  });
  
  // Report status every hour
  setInterval(() => {
    const stats = {
      total: lineageHistory.size,
      thrashing: 0,
      evolving: 0,
      uncertain: 0,
      insufficient: 0
    };
    
    for (const [id, history] of lineageHistory) {
      stats[history.status] = (stats[history.status] || 0) + 1;
    }
    
  }, 60 * 60 * 1000);
}

module.exports = { startChameleon, assessLineage, recordMutation, getLineageStatus };
