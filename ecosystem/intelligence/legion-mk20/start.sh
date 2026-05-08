#!/bin/bash

cd "$(dirname "$0")"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    LEGION MK20 — SCP Native                      ║"
echo "║                    Starting System...                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Load environment
set -a
source .env 2>/dev/null
set +a

# Kill existing processes
pkill -f "node api/server.js" 2>/dev/null
pkill -f "node index.js" 2>/dev/null
pkill -f "node web/server.js" 2>/dev/null
pkill -f "node api/emergency.js" 2>/dev/null
sleep 2

# Create directories
mkdir -p logs data/strategies data/library reports backups

# Start API server FIRST (detached)
echo "🌐 Starting API server on port 3011..."
nohup node api/server.js > logs/api.log 2>&1 &
API_PID=$!
echo $API_PID > logs/api.pid
sleep 3

# Verify API is running
if ! curl -s http://localhost:3011/api/status > /dev/null 2>&1; then
    echo "❌ API server failed to start"
    cat logs/api.log | tail -5
    exit 1
fi
echo "✅ API server running (PID: $API_PID)"

# Start Web Editor (detached)
if [ "$DISABLE_WEB" != "true" ]; then
    echo "🎨 Starting Web Editor on port 9000..."
    nohup node web/server.js > logs/web.log 2>&1 &
    WEB_PID=$!
    echo $WEB_PID > logs/web.pid
    sleep 1
    echo "✅ Web editor running (PID: $WEB_PID)"
fi

# Start Emergency API (detached)
echo "🚨 Starting Emergency API on port 3003..."
nohup node api/emergency.js > logs/emergency.log 2>&1 &
EMERGENCY_PID=$!
echo $EMERGENCY_PID > logs/emergency.pid
sleep 1
echo "✅ Emergency API running (PID: $EMERGENCY_PID)"

# Run tests (optional)
if [ "$SKIP_TESTS" != "true" ]; then
    echo "🧪 Running pre-startup tests..."
    if node -e "
        const { TestRunner } = require('./core/test_runner');
        const path = require('path');
        const runner = new TestRunner(path.join(__dirname, 'scp', 'tests.scp'));
        if (!runner.load()) process.exit(1);
        runner.runAll().then(passed => {
            if (!passed) process.exit(1);
        });
    " 2>/dev/null; then
        echo "✅ Tests passed"
    else
        echo "⚠️ Tests failed - continuing anyway"
    fi
fi

# Start LEGION Core (detached)
echo "🤖 Starting LEGION Core..."
nohup node index.js > logs/legion.log 2>&1 &
LEGION_PID=$!
echo $LEGION_PID > logs/legion.pid

sleep 5

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    LEGION MK20 — RUNNING                         ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  🟢 API:          http://localhost:3011                         ║"
echo "║  🟢 Visual Editor: http://localhost:9000                        ║"
echo "║  🟢 Emergency:    http://localhost:3003                         ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  📊 Status:       curl http://localhost:3011/api/status        ║"
echo "║  🛑 Stop:         ./stop.sh                                      ║"
echo "║  📝 Logs:         tail -f logs/legion.log                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Quick health check
sleep 2
curl -s http://localhost:3011/api/status | jq '{entropy, agents, paper_mode}' 2>/dev/null
echo ""
echo "✅ LEGION MK20 is running in background"
echo "   Use ./stop.sh to stop all processes"
echo "   Use tail -f logs/legion.log to watch logs"
