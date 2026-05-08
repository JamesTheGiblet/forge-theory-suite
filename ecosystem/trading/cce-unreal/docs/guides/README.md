# Guides

Practical walkthroughs for common tasks.

---

## Tutorials

### Building se-forex End to End

`se-forex` is already scaffolded at `engines/se-forex/`. It's registered, running in DRY RUN, and appearing in `cce list`. It just needs its three methods implemented.

The existing `ForexDataFeed` in `src/forex-data-feed.js` already fetches EUR/USD from Yahoo Finance. Wiring `se-forex` to it is straightforward:

**1. Implement `_fetchData()` in `engines/se-forex/engine.js`:**

```javascript
async _fetchData() {
  if (!this._forexFeed) {
    const ForexDataFeed = require('../../src/forex-data-feed');
    this._forexFeed = new ForexDataFeed(this.config);
  }
  const data = await this._forexFeed.getMarketData();
  if (!data || !data.price) return null;

  // Keep price history for SMA calculation
  this.priceHistory = this.priceHistory || [];
  this.priceHistory.push({ close: data.price, date: new Date().toISOString().slice(0,10) });
  if (this.priceHistory.length > 200) this.priceHistory.shift();

  return { ...data, priceHistory: this.priceHistory };
}
```

**2. Implement `_evaluateSignals(data)` in `engines/se-forex/engine.js`:**

```javascript
_evaluateSignals(data) {
  const closes = data.priceHistory.map(c => c.close);
  const sma    = (arr, n) => arr.length < n ? null :
    arr.slice(-n).reduce((a,b) => a+b, 0) / n;

  const sma20  = sma(closes, 20);
  const sma50  = sma(closes, 50);
  const price  = data.price;

  const returns7d = closes.length > 7
    ? (closes[closes.length-1] - closes[closes.length-8]) / closes[closes.length-8]
    : 0;

  return {
    aboveSma20:    sma20 ? price > sma20 : false,
    aboveSma50:    sma50 ? price > sma50 : false,
    oversold:      data.rsi14 ? data.rsi14 < 30 : false,
    overbought:    data.rsi14 ? data.rsi14 > 70 : false,
    trend7d:       returns7d,
    trendPositive: returns7d > 0.002,
    trendNegative: returns7d < -0.002,
    price:         price,
    sessionActive: data.isLondonSession || data.isNYSession || false
  };
}
```

**3. Implement `_executeDecision(signals, data)` in `engines/se-forex/engine.js`:**

```javascript
async _executeDecision(signals, data) {
  // No exchange for forex — simulate PnL from price movement
  if (this.currentState === 'WATCHING' || this.currentState === 'DORMANT') return;

  if (this.dryRun) {
    console.log(`[${PREFIX}] DRY RUN — state: ${this.currentState} price: ${data.price}`);
    return;
  }

  // Real forex execution would go here via broker API
}
```

**4. Implement FSM methods in `engines/se-forex/strategy.js`:**

```javascript
_entryConditionBuilding(signals) {
  return signals.aboveSma20 && !signals.aboveSma50;
}

_entryConditionMet(signals) {
  return signals.aboveSma20 && signals.aboveSma50 && signals.trendPositive;
}

_conditionsDeteriorated(signals) {
  return !signals.aboveSma20 || signals.trendNegative;
}

_exitConditionMet(signals, data) {
  return signals.overbought || signals.trendNegative;
}
```

**5. Validate and restart:**

```bash
cce validate se-forex
pm2 restart cce-bot
pm2 logs cce-bot 2>&1 | grep SE-FOR
```

---

## Running the Pipeline

The AI Framework Pipeline generates validated engines from a hypothesis:

```bash
# 1. Create a target spec
cp pipeline/targets/template.json pipeline/targets/btc-alt-rotation.json

# 2. Edit the spec — set:
#    hypothesis, asset_universe, time_window, success_criteria

# 3. Run the pipeline
node pipeline/cce-pipeline.js --target pipeline/targets/btc-alt-rotation.json

# 4. Watch the output
# pipeline/runs/run_<timestamp>/
#   target_spec.json
#   analytics_report.json
#   state_map.json
#   temporal_profile.json
#   strategy/           ← generated engine files
#   metrics_card.json   ← signed if APPROVED
#   pipeline.log

# 5. If APPROVED, the strategy/ folder is a working engine
cp -r pipeline/runs/run_<timestamp>/strategy ~/cce-crypto/engines/my-new-engine
cce validate my-new-engine
pm2 restart cce-bot
```

---

## Enabling the G.O

G.O activates automatically once the Observer has enough data:

```bash
# Check observer cycle count
curl -s http://localhost:3000/api/obs/status | grep obsCount
# Need obsCount >= 96

# Enable G.O in config.js
# Change: enabled: false  →  enabled: true

pm2 restart cce-bot

# Watch G.O boot
pm2 logs cce-bot 2>&1 | grep "G\.O"
# [G.O] Starting Grand Orchestrator
# [G.O] ⏳ Waiting: Observer has 47/96 cycles
```

Once active, G.O moves through states: WAITING → OBSERVING (24 baseline cycles) → ADVISORY.

---

## Troubleshooting

### Engine not loading after pm2 restart

```bash
# Check what the registry says
cat ~/.pm2/logs/cce-bot-out.log | grep REGISTRY | tail -10

# Validate the engine
cce validate my-engine

# Common fixes:
# 1. module.exports = ClassName  (not TemplateEngine/TemplateStrategy/TemplateStorage)
# 2. storage.js uses sql.js with async init (not better-sqlite3)
# 3. manifest.json author field is not empty
# 4. All dryRun references use !== false pattern
```

### Dashboard returning 404 or empty

```bash
# Check both processes are running
pm2 ls

# Check dashboard logs
cat ~/.pm2/logs/dashboard-error.log | tail -20

# Check the route exists
grep -n "app.get" ~/cce-crypto/dashboard-server.js | grep registry
```

### PM2 restarting repeatedly (errored state)

```bash
# Get the actual error
cat ~/.pm2/logs/cce-bot-error.log | tail -30

# Common causes:
# EADDRINUSE :3000  → dashboard-server.js being required from index.js
#                     (causes double app.listen)
# MODULE_NOT_FOUND  → missing require, check path
# TemplateX is not defined → module.exports still points to old class name
```

### Termux `/tmp` permission denied

```bash
# Use home directory instead
# WRONG:  > /tmp/file.js
# RIGHT:  > ~/file.js
```

### sql.js "SQL.Database is not a constructor"

```bash
# initSqlJs() returns a Promise — must await it
# WRONG:
const SQL = initSqlJs();
this.db = new SQL.Database();  # SQL is a Promise, not the module

# RIGHT:
const SQL = await initSqlJs();
this.db = new SQL.Database();
```

---

## Best Practices

**Always start in dry run.** The default `dryRun: true` is intentional. It takes 7+ cycles of clean dry operation before considering live capital.

**Keep module.exports consistent.** When the CLI renames your class from `TemplateEngine` to `MyEngine`, make sure `module.exports = MyEngine` at the bottom of the file matches.

**Never hardcode thresholds.** All numeric values (stop loss %, entry threshold, etc.) must come from `config`. The pipeline validates for hardcoded values — they will fail Gate 04.

**Use `require('../../src/existing-feed')` not rewrites.** The existing data feeds (`ForexDataFeed`, `MarketDataFeed`) are battle-tested on Termux. Reuse them rather than rewriting.

**Log every cycle.** The `storage.logCycle()` call is there for a reason. O.E Observer reads from it. G.O reads from it. The replay viewer plays it back. Don't skip it.

**One engine, one database.** Each engine writes to its own `.db` file in `data/`. Never share databases between engines.
