#!/bin/bash

# LEGION MK20 - Status Check

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    LEGION MK20 — STATUS                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if API is responding
if curl -s http://localhost:3011/api/status > /dev/null 2>&1; then
    echo "🟢 API: Running on port 3011"
    curl -s http://localhost:3011/api/status | jq '{
        scp_id,
        version,
        entropy,
        threshold,
        agents,
        paper_mode
    }'
else
    echo "🔴 API: Not responding"
fi

echo ""

# Check Emergency API
if curl -s http://localhost:3003/api/emergency/status > /dev/null 2>&1; then
    echo "🟢 Emergency API: Running on port 3003"
    curl -s http://localhost:3003/api/emergency/status | jq '.'
else
    echo "🔴 Emergency API: Not responding"
fi

echo ""

# Check Web Editor
if curl -s http://localhost:9000 > /dev/null 2>&1; then
    echo "🟢 Web Editor: Running on port 9000"
else
    echo "🔴 Web Editor: Not responding"
fi

echo ""

# Show running processes
echo "📊 Running Processes:"
ps aux | grep -E "node.*legion-mk20" | grep -v grep | wc -l | xargs echo "   Node processes:"

echo ""
echo "📝 Log files:"
ls -la logs/*.log 2>/dev/null | wc -l | xargs echo "   Log files:"
echo ""
echo "   tail -f logs/legion.log - View main logs"
echo "   tail -f logs/api.log - View API logs"
echo ""
