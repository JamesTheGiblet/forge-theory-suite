#!/bin/bash
echo "=========================================="
echo " UBVM Termux Session Start"
echo "=========================================="

# 1. Pull latest changes
echo "[1/4] Syncing from Git..."
git pull

# 2. Stop any existing background daemons to prevent port conflicts
echo "[2/4] Stopping old daemons..."
pkill -f network_daemon.py
pkill -f scheduler_daemon.py
pkill -f telegram_ear.py

# Set environment variables
export UBVM_TELEGRAM_BOT_TOKEN="your_bot_token_here"
export UBVM_TELEGRAM_CHAT_ID="your_chat_id_here"

# 3. Start daemons in the background
echo "[3/4] Starting UBVM Daemons..."
mkdir -p logs
nohup python network_daemon.py 8080 > logs/network.log 2>&1 &
nohup python scheduler_daemon.py > logs/scheduler.log 2>&1 &
nohup python clients/telegram_ear.py > logs/telegram_ear.log 2>&1 &

echo "[4/4] Opening Dashboard..."
sleep 2
termux-open-url http://localhost:8080/dashboard

echo "=========================================="
echo " Session ready! Daemons running in background."
echo " Run './termux-finish.sh' when you are done."
echo "=========================================="