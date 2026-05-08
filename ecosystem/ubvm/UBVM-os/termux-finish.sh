#!/bin/bash
echo "=========================================="
echo " UBVM Termux Session Finish"
echo "=========================================="

# 1. Stop background daemons
echo "[1/2] Stopping UBVM Daemons..."
pkill -f network_daemon.py
pkill -f scheduler_daemon.py
pkill -f telegram_ear.py

# 2. Commit and push
echo "[2/2] Pushing changes to Git..."
git add .
git commit -m "Termux session auto-sync $(date +'%Y-%m-%d %H:%M')"
git push

echo "=========================================="
echo " Session finished and synced!"
echo "=========================================="