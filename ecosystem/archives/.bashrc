alias gen-report="cd ~/cce-crypto && node scripts/generate-report.js"


# CCE Crypto aliases (Termux compatible)
alias cce-report='cd ~/cce-crypto && node scripts/generate-report.js'
alias cce-status='tail -n 50 ~/cce-crypto/reports/cce-report-*.txt | tail -n 50'
alias cce-anomalies='grep -A 2 "WARN\|ALERT" ~/cce-crypto/reports/cce-report-*.txt | tail -n 20'
alias cce-grid='grep -A 8 "GRID LIVE STATUS" ~/cce-crypto/reports/cce-report-*.txt'
alias cce-watch='watch -n 30 "tail -n 40 ~/cce-crypto/reports/cce-report-*.txt | tail -n 40"'
alias cce-summary='grep -E "Portfolio now:|BTC current:|Fear & Greed:|Active anomalies:" ~/cce-crypto/reports/cce-report-*.txt | tail -n 8'
alias cce-dash='ps aux | grep dashboard-server | grep -v grep'
alias cce-latest='ls -lt ~/cce-crypto/reports/cce-report-*.txt | head -1'

# Start CCE dashboard if not already running
if ! pm2 list | grep -q "dashboard"; then
    cd ~/cce-crypto
    pm2 start dashboard-server.js --name dashboard
fi

if ! pm2 list | grep -q "cce-bot"; then
    cd ~/cce-crypto
    pm2 start index.js --name cce-bot
fi
alias cce-start="cd ~/cce-crypto && pm2 resurrect && termux-open-url http://localhost:3000"

# Better CCE start with port cleanup
alias cce-start='fuser -k 3000/tcp 2>/dev/null; cd ~/cce-crypto && pm2 resurrect && sleep 2 && termux-open-url http://localhost:3000'

# Better CCE start with port cleanup
alias cce-start='fuser -k 3000/tcp 2>/dev/null; cd ~/cce-crypto && pm2 resurrect && sleep 2 && termux-open-url http://localhost:3000'

# Start Kraken Intelligence monitor
~/kraken-intelligence/dryrun/manage.sh start 2>/dev/null 
# Start Kraken Intelligence monitor
~/kraken-intelligence/dryrun/manage.sh start 2>/dev/null 
# Start Kraken Intelligence monitor
~/kraken-intelligence/dryrun/manage.sh start 2>/dev/null
gsync() { git add .; git commit -m "$1"; git push; }
cd ~/legion && pm2 resurrect 2>/dev/null || pm2 start start_legion_full.js --name legion
