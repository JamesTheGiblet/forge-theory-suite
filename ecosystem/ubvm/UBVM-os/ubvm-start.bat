@echo off
echo ==========================================
echo  UBVM Windows Session Start
echo ==========================================

cd C:\Users\gilbe\Documents\UBVM-os

echo [1/4] Syncing from Git...
git pull

echo [2/4] Setting environment...
set UBVM_HOME=C:\Users\gilbe\Documents\UBVM-os
set UBVM_TELEGRAM_BOT_TOKEN=your_bot_token_here
set UBVM_TELEGRAM_CHAT_ID=your_chat_id_here

echo [3/4] Starting UBVM Daemons in new windows...
start "UBVM Network Node" /min python "%~dp0network_daemon.py" 8080
start "UBVM Scheduler" /min python "%~dp0scheduler_daemon.py"
start "UBVM Telegram Ear" /min python "%~dp0clients\telegram_ear.py"

echo [4/4] Opening Dashboard...
timeout /t 2 >nul
start http://localhost:8080/dashboard

echo ==========================================
echo  Session ready. Daemons running in minimised windows.
echo  Run ubvm-finish.bat when done.
echo ==========================================