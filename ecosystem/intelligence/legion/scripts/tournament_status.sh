#!/bin/bash
cd ~/legion
echo ""
echo "=== TOURNAMENT LEADERBOARD ==="
node -e "
const data = require('./data/tournament.json');
console.log('Active strategies:', data.active.join(', '));
console.log('');
for (const id of data.active) {
  const s = data.standings[id];
  if (s) {
    console.log(`${id} (${s.class}): ${(s.realPnl*100).toFixed(1)}% PnL | ${s.trades} trades | ${(s.winRate*100).toFixed(0)}% WR`);
  }
}
"
