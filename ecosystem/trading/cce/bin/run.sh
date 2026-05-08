#!/data/data/com.termux/files/usr/bin/bash
echo "🚀 Running CCE Signal Monitor..."
cd ~/cce
python3 cap_signal.py

echo ""
echo "📊 Current Signal State:"
if [ -f ~/cce/state.json ]; then
    cat ~/cce/state.json | python3 -m json.tool 2>/dev/null || cat ~/cce/state.json
else
    echo "No state file yet - run the script first"
fi
