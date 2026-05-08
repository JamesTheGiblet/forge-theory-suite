#!/bin/bash
echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                    LEGION MK9 – SYSTEM STATUS                             ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 CORE METRICS:"
echo "   Active Strategies:   $(ls -1 ~/legion/strategies/active/*.json 2>/dev/null | wc -l)"
echo "   Containment Breaches: $(cat ~/legion/data/containment_log.json 2>/dev/null | jq '. | length' 2>/dev/null || echo '0')"
echo ""

echo "🏆 TOURNAMENT LEADERBOARD:"
node -e "
const data = require('./data/tournament.json');
let i = 1;
for (const id of data.active) {
  const s = data.standings[id];
  if (s) {
    const pnl = (s.realPnl * 100).toFixed(1);
    const wr = (s.winRate * 100).toFixed(0);
    console.log('   ' + i + '. ' + id + ' (' + s.class + '): ' + pnl + '% PnL | ' + s.trades + ' trades | ' + wr + '% WR');
    i++;
  }
}
"

echo ""
echo "📋 PAPER MODE:"
tail -1 ~/legion/data/paper_mode.log 2>/dev/null | sed 's/^/   /'

echo ""
echo "🖥️ SERVICES:"
pm2 list | grep -E "legion|dashboard|api" | grep -v "cce" | awk '{print "   " $2 ": " $8}'
echo ""
echo "🌐 DASHBOARD:          http://localhost:9000"
echo ""
