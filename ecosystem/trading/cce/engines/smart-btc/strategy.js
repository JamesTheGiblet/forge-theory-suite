// strategy.js - Smart BTC Strategy
module.exports = {
  name: "Smart BTC Strategy",
  version: "1.0.0",
  
  validate: function() {
    console.log(`  📋 Smart BTC strategy validated`);
    return true;
  },
  
  entryRules: {
    type: 'or',
    conditions: [
      { type: 'consecutive', params: { count: 4, direction: 'red' } },
      { type: 'rsi', params: { period: 21, compare: '<', value: 20 } }
    ]
  },
  
  exitRules: {
    targetPct: 5,
    stopPct: 2.5,
    maxHoldDays: 14
  },
  
  entryTiming: 'next_open',
  
  params: {
    targetPct: 5,
    stopPct: 2.5,
    maxHoldDays: 14
  }
};
