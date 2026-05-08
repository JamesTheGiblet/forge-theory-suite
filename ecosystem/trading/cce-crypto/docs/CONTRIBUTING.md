# Contributing to CCE
### How to Add an Engine, Layer, or Feature

**Giblets Creations · v2.4.0 · March 2026**

---

## Who This Is For

Anyone working on the CCE platform — James, Abe, or any future contributor.
This document explains the rules, patterns, and process for adding to the platform
without breaking what's already running.

---

## The Golden Rules

1. **DRY RUN by default.** Every new engine must default to `dryRun: true`.
   Never ship code that defaults to live trading.

2. **sql.js only.** No native SQLite bindings. The platform runs on Android via
   Termux. Use `require('sql.js')` with `await initSqlJs()`.

3. **No /tmp.** Termux doesn't have `/tmp`. Use `~/` or `process.cwd()` for
   temporary files.

4. **module.exports = ClassName.** Must match the actual class name exactly.
   Not `TemplateEngine`, not `module.exports = { ClassName }`.

5. **Shutdown handler last.** In `index.js`, the shutdown handler must be defined
   AFTER all engine variables are declared.

6. **CORS proxy.** Browser on port 3001 cannot fetch from port 3000 directly.
   Always use `/api/proxy/*` endpoints.

---

## Adding a New Engine

### Step 1 — Scaffold

```bash
cce new-engine my-engine --type strategic --cycle 4H
This creates engines/my-engine/ with:
engine.js — implement _fetchData(), _evaluateSignals(), _executeDecision()
strategy.js — implement _entryConditionBuilding(), _entryConditionMet(),
_conditionsDeteriorated(), _exitConditionMet()
storage.js — sql.js storage (already wired)
manifest.json — update id, name, type, ecosystem, cycle, capitalKey
README.md — document what the engine does
Step 2 — Implement
The three methods you must implement in engine.js:
async _fetchData() {
  // Fetch market data
  // Return data object or null on failure
  // Never throw — return null and log
}

_evaluateSignals(data) {
  // Compute signals from data
  // Return plain object of booleans and numbers
  // Example: { aboveSma20: true, rsi: 34.2, oversold: true }
}

async _executeDecision(signals, data) {
  // Act on current state
  // ALWAYS check this.dryRun first
  if (this.dryRun) {
    console.log(`[${PREFIX}] DRY RUN — would act here`);
    return;
  }
  // Real action only if dryRun is false
}
Step 3 — Validate
cce validate my-engine
Must pass all interface checks before registering.
Step 4 — Test
# Restart bot — registry auto-detects new engine
pm2 restart cce-bot

# Check it loaded
cat ~/.pm2/logs/cce-bot-out.log | grep REGISTRY
# Should show: ✅ Loaded: my-engine

# Check for errors
cat ~/.pm2/logs/cce-bot-error.log | tail -20
Step 5 — Add Config Block
Add to config.js:
myEngine: {
  enabled:    true,
  dryRun:     true,   // NEVER false until validated
  capitalUSDC: 100,
  intervalMinutes: 240,
  maxDailyLoss: 0.03,
},
Adding a New Dashboard Endpoint
Add to dashboard-server.js:
app.get('/api/my-engine/status', async (req, res) => {
  const row = await queryDb('my-engine-production.db',
    'SELECT state, portfolio_value FROM my_cycles ORDER BY id DESC LIMIT 1',
    { state: 'DORMANT', portfolio_value: 0 }
  );
  res.json(row);
});
Use the shared queryDb() helper — never inline sql.js calls.
Adding a New Dashboard Widget
In public/index.html, add a new regime-widget div:
<div class="regime-widget">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="font-size:14px;font-weight:600;color:#D4AF37;">🔧 My Widget</div>
    <span id="myStatus" style="font-size:11px;color:#10b981;">● Online</span>
  </div>
  <div id="myContent" style="font-size:12px;color:#8DA0B0;">Loading...</div>
</div>
Add fetch function using string concatenation (NOT template literals inside HTML):
async function fetchMyWidget() {
  try {
    const res = await fetch('/api/my-engine/status');
    const data = await res.json();
    document.getElementById('myContent').innerHTML =
      'State: ' + data.state + ' | Value: $' + data.portfolio_value;
  } catch(e) {}
}
Add to the init calls at the bottom of the script:
fetchMyWidget();
setInterval(fetchMyWidget, 30000);
Database Conventions
Convention
Rule
File location
~/cce-crypto/data/
Naming
[engine-id]-production.db
Primary key
id INTEGER PRIMARY KEY AUTOINCREMENT
Timestamps
TEXT in ISO format
Boolean
INTEGER (0 or 1)
Always use
CREATE TABLE IF NOT EXISTS
Cron Process Convention
One-shot scripts (F.L, AUDIT, CSS pattern):
// Must end with:
main().catch(console.error);
Register with PM2:
pm2 start src/my-script.js --name my-process \
  --cron "0 8 * * *" --no-autorestart
pm2 save
Before Committing
[ ] Engine defaults to dryRun: true
[ ] All sql.js calls use CREATE TABLE IF NOT EXISTS
[ ] No hardcoded values — all from config.js
[ ] module.exports = ClassName matches actual class name
[ ] cce validate my-engine passes
[ ] CHANGELOG.md updated
[ ] README.md in engine folder written
Giblets Creations · v2.4.0 · March 2026
"I wanted it. So I forged it. Now forge yours."
