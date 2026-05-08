#!/bin/bash
cd ~/legion
node -e "
const { getSentiment, getSentimentAction, refreshSentiment } = require('./shared/sentiment');
refreshSentiment().then(s => {
  const action = getSentimentAction(s.value);
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              FEAR & GREED INDEX – MARKET SENTIMENT            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Value:        ' + s.value + '/100');
  console.log('  Classification: ' + action.emoji + ' ' + s.classification);
  console.log('  Action:       ' + action.action.toUpperCase());
  console.log('  Updated:      ' + new Date(s.timestamp).toLocaleString());
  console.log('');
  
  const barLength = 20;
  const filled = Math.floor(s.value / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log('  [' + bar + ']');
  console.log('  Fear ←─────────────────────────────────────────→ Greed');
  console.log('');
});
"
