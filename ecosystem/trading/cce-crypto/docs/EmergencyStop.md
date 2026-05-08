# Emergency Stop Procedure

**USE THIS IF:**
- The bot is cycling uncontrollably
- Portfolio value dropping rapidly
- Kraken reporting repeated API errors
- You just want out. NOW.

---

## PHASE 1 — KILL THE ENGINES

### Option A: Stop everything (fastest)
```bash
pm2 stop all
Option B: Stop just the trading engine
pm2 stop cce-bot
Option C: Stop individual engine via config
Edit config.js — set the problem engine to enabled: false then:
pm2 restart cce-bot
Confirm stopped:
pm2 ls
# cce-bot should show 'stopped'
PHASE 2 — SECURE THE FUNDS
The engine is stopped. Now check Kraken directly.
Log in to kraken.com
Go to Trade → Orders — cancel any open limit orders
Check Portfolio — decide if you want to stay in BTC or move to USDC
To exit to USDC: Trade → BTC/USDC → Sell → Market → 100%
PHASE 3 — SAVE THE EVIDENCE
Before touching anything, save the logs:
# Save last 200 lines of bot logs
cat ~/.pm2/logs/cce-bot-out.log | tail -200 > ~/emergency_$(date +%Y%m%d_%H%M).txt
cat ~/.pm2/logs/cce-bot-error.log | tail -200 >> ~/emergency_$(date +%Y%m%d_%H%M).txt

# Check last known state
curl -s http://localhost:3000/api/status
PHASE 4 — DO NOT RESTART YET
Open config.js
Set execution.dryRun: true for all engines
Identify what caused the failure from the logs
Only restart once you understand what happened
# Restart in dry run only after config change
pm2 restart cce-bot
pm2 logs cce-bot --lines 50
PHASE 5 — DIAGNOSE
Common causes:
Symptom
Likely cause
Rapid state cycling
Data feed returning bad values
API errors
Kraken rate limit or key issue
Process crashing
Memory leak or unhandled exception
Wrong trades
Config error or signal bug
Check:
# Error log
cat ~/.pm2/logs/cce-bot-error.log | tail -50

# Last database entry
node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('data/cce-production.db'));
  const r = db.exec('SELECT * FROM cce_cycles ORDER BY id DESC LIMIT 3');
  console.log(r[0]?.columns);
  console.log(r[0]?.values);
  db.close();
});
"
Quick Reference
pm2 stop all              # Stop everything
pm2 stop cce-bot          # Stop engines only
pm2 stop dashboard        # Stop dashboard only
pm2 ls                    # Check status
pm2 restart cce-bot       # Restart after fix
pm2 save                  # Save current state
Giblets Creations · v2.4.0 · March 2026
"If in doubt, stop. Capital can be recovered. Panic trades cannot be undone."
