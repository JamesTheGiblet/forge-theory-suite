#!/data/data/com.termux/files/usr/bin/bash

echo "🧪 Running signal check once..."
cd ~/cce
python3 bin/cap_signal.py
echo ""
./bin/status.sh
