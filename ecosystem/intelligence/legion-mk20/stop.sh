#!/bin/bash

cd "$(dirname "$0")"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    LEGION MK20 — STOPPING                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Kill by PID files
for pidfile in logs/*.pid; do
    if [ -f "$pidfile" ]; then
        PID=$(cat "$pidfile")
        if kill -0 $PID 2>/dev/null; then
            echo "🛑 Stopping PID $PID (from $pidfile)"
            kill -15 $PID 2>/dev/null
            sleep 1
            kill -9 $PID 2>/dev/null
        fi
        rm -f "$pidfile"
    fi
done

# Kill any remaining node processes
echo "🔍 Cleaning up remaining processes..."
pkill -f "node api/server.js" 2>/dev/null
pkill -f "node index.js" 2>/dev/null
pkill -f "node web/server.js" 2>/dev/null
pkill -f "node api/emergency.js" 2>/dev/null

echo ""
echo "✅ LEGION MK20 stopped"
echo ""
