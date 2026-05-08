#!/data/data/com.termux/files/usr/bin/bash
while true; do
    clear
    echo "🔍 Watching for FULL SIGNAL (4/4)"
    echo "Current: $(cat ~/cce/state.json | grep -A 5 capSignal)"
    echo ""
    echo "Press Ctrl+C to stop"
    sleep 60
done
