@echo off
echo ==========================================
echo  UBVM Windows Session Finish
echo ==========================================

cd C:\Users\gilbe\Documents\UBVM-os

echo [1/2] Stopping UBVM Daemons...
taskkill /F /FI "WINDOWTITLE eq UBVM Network Node*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq UBVM Scheduler*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq UBVM Telegram Ear*" /T >nul 2>&1

echo [2/2] Pushing changes to Git...
git add .
git commit -m "Windows session auto-sync %date% %time%"
git push

echo ==========================================
echo  Session finished and synced!
echo ==========================================