const { getCurrentPrice } = require('../shared/kraken_adapter');
const { logBreach } = require('../shared/observability_client');

function evaluateConditions(conditions, marketData) {
  // Entry conditions
  if (conditions.entry) {
    let entryMet = false;
    
    // Check 'all' conditions
    if (conditions.entry.all && conditions.entry.all.length > 0) {
      entryMet = conditions.entry.all.every(cond => evaluateCondition(cond, marketData));
    }
    
    // Check 'any' conditions
    if (conditions.entry.any && conditions.entry.any.length > 0 && !entryMet) {
      entryMet = conditions.entry.any.some(cond => evaluateCondition(cond, marketData));
    }
    
    if (!entryMet) return { shouldEnter: false, reason: 'Entry conditions not met' };
  }
  
  // Exit conditions
  if (conditions.exit) {
    let exitMet = false;
    
    if (conditions.exit.any && conditions.exit.any.length > 0) {
      exitMet = conditions.exit.any.some(cond => evaluateCondition(cond, marketData));
    }
    
    if (exitMet) return { shouldExit: true, reason: 'Exit condition triggered' };
  }
  
  return { shouldEnter: true, shouldExit: false, reason: 'Conditions satisfied' };
}

function evaluateCondition(condition, marketData) {
  const { indicator, operator, value, period, multiplier, lookback, percent, max_hours } = condition;
  
  switch (indicator) {
    case 'rsi':
      // RSI calculation from market data
      if (!marketData.rsi) return false;
      const rsi = marketData.rsi[period || 14];
      if (operator === '<') return rsi < value;
      if (operator === '>') return rsi > value;
      break;
      
    case 'volume':
      const avgVolume = marketData.avgVolume || 1;
      const currentVolume = marketData.volume || 0;
      if (operator === '>') return currentVolume > avgVolume * (multiplier || 1.5);
      break;
      
    case 'trailing_stop':
      const highestPrice = marketData.highestPrice || marketData.price;
      const currentPrice = marketData.price;
      const drawdown = ((highestPrice - currentPrice) / highestPrice) * 100;
      return drawdown >= (percent || 1.5);
      
    case 'time_in_trade':
      const hoursInTrade = marketData.hoursInTrade || 0;
      return hoursInTrade >= (max_hours || 48);
      
    default:
      // console.log(`[AUDITOR] Unknown indicator: ${indicator}`);
      return false;
  }
  
  return false;
}

async function getMarketData(asset) {
  try {
    const price = await getCurrentPrice(asset);
    // TODO: Add RSI calculation from candles
    return {
      price,
      volume: 0, // Placeholder
      avgVolume: 0, // Placeholder
      rsi: { 14: 50 }, // Placeholder
      timestamp: Date.now()
    };
  } catch (err) {
    console.error('[AUDITOR] Failed to get market data:', err.message);
    return null;
  }
}

async function auditStrategy(strategy) {
  // console.log(`[AUDITOR] Evaluating ${strategy.scp_id} - ${strategy.name}`);
  
  const marketData = await getMarketData(strategy.asset || 'BTC/USD');
  if (!marketData) {
    return { passed: false, reason: 'Market data unavailable', class: 'Pending' };
  }
  
  const evaluation = evaluateConditions(strategy.conditions, marketData);
  
  // Log if strategy is acting erratically
  if (evaluation.shouldExit && strategy.object_class === 'Safe') {
    logBreach('UNEXPECTED_EXIT', `${strategy.scp_id} triggered exit in Safe mode`, 'auditor');
  }
  
  const passed = evaluation.shouldEnter === true;
  
  return {
    passed,
    reason: evaluation.reason,
    marketData: { price: marketData.price, timestamp: marketData.timestamp },
    class: passed ? strategy.object_class : 'Rejected'
  };
}

// For compatibility with existing message bus
const { registerHandler, sendMessage } = require('../bus/router');

function startAuditor() {
  registerHandler('AUDIT_REQUEST', async (msg) => {
    const result = await auditStrategy(msg.payload.strategy);
    sendMessage('tournament', 'AUDIT_RESULT', {
      strategyId: msg.payload.strategyId,
      result
    });
  });
  
  // console.log('[AUDITOR] Ready (real evaluation mode)');
}

if (require.main === module) {
  // Test mode
  const testStrategy = {
    scp_id: "TEST-001",
    name: "Test Strategy",
    object_class: "Euclid",
    asset: "BTC/USD",
    conditions: {
      entry: {
        all: [{ indicator: "rsi", period: 14, operator: "<", value: 30 }]
      }
    }
  };
  
  auditStrategy(testStrategy).then(// console.log);
}

module.exports = { startAuditor, auditStrategy };
