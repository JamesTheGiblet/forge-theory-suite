#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting CCE Signal Monitor..."

# Ensure symlink exists
ln -sf ~/cce/state/current_state.json ~/cce/state.json

# Add to crontab
(crontab -l 2>/dev/null | grep -v "cap_signal.py"; echo "5 * * * * /data/data/com.termux/files/usr/bin/python3 /data/data/com.termux/files/home/cce/bin/cap_signal.py") | crontab -

echo "✅ Scheduled to run at minute 5 every hour"
echo "Run './bin/status.sh' to check status"
