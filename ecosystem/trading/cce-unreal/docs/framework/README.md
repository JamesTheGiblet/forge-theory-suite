# Framework SDK

The CCE Framework provides the standardised contract that every engine must follow. It is what makes CCE a platform — not just a collection of scripts.

---

## The Engine Contract

Every engine must expose these methods and properties:

```
Method/Property    Type        Required    Description
─────────────────────────────────────────────────────────────────
start(interval)    async fn    YES         Boot the engine, begin cycle loop
stop()             fn          YES         Graceful shutdown, close storage
runCycle()         async fn    YES         One complete decision cycle
getStatus()        fn          YES         Return plain object of current state
getState()         fn          YES         Return current FSM state string
isRunning          boolean     YES         Is the cycle loop active?
cycleCount         integer     YES         Number of completed cycles
dryRun             boolean     YES         Must default to TRUE
```

The registry validates all of these on boot. Any engine missing a method or defaulting `dryRun` to `false` is **rejected**.

---

## Engine Lifecycle

A full engine cycle follows this sequence:

```
1. _checkDailyReset()         — reset dailyPnl and dailyTrades if 24h elapsed
2. _circuitBreakerTripped()   — skip cycle if daily loss limit hit
3. _fetchData()               — fetch market data (implement this)
4. _evaluateSignals()         — compute signals from data (implement this)
5. strategy.evaluate()        — FSM determines next state
6. _transition() if needed    — log transition, notify via Telegram
7. _executeDecision()         — act on current state (implement this)
8. storage.logCycle()         — persist cycle data
```

---

## Implement These Three Methods

These are the only methods you write. Everything else is wired up.

### `_fetchData()`

```javascript
async _fetchData() {
  // Fetch market data from exchange, APIs, or other sources
  // Return a plain object, or null if fetch fails
  // null causes the cycle to be skipped gracefully

  const ticker = await this.exchange.fetchTicker('ETH/USD');
  const fg = await axios.get('https://api.alternative.me/fng/');

  return {
    price:     ticker.last,
    volume:    ticker.baseVolume,
    fearGreed: parseInt(fg.data.data[0].value)
  };
}
```

### `_evaluateSignals(data)`

```javascript
_evaluateSignals(data) {
  // Compute boolean and numeric signals from market data
  // Return a plain object — same keys every cycle
  // These drive the FSM transitions

  const closes = this.priceHistory.map(c => c.close);
  const sma20  = closes.slice(-20).reduce((a,b) => a+b, 0) / 20;

  return {
    priceAboveSma20: data.price > sma20,
    fearGreedLow:    data.fearGreed < 25,
    fearGreedHigh:   data.fearGreed > 75,
    volumeSpike:     data.volume > this.avgVolume * 1.5
  };
}
```

### `_executeDecision(signals, data)`

```javascript
async _executeDecision(signals, data) {
  // Act on the current FSM state
  // ALWAYS check this.dryRun before placing real orders

  if (this.currentState !== STATE.ACTIVE) return;

  if (this.dryRun) {
    console.log(`[${PREFIX}] DRY RUN — would buy ${this.capital} USDC of BTC`);
    return;
  }

  // Real order only if dryRun is explicitly false
  await this.exchange.createOrder('BTC/USD', 'market', 'buy', qty);
  this.dailyTrades++;
}
```

---

## The FSM — Four Methods in strategy.js

The state machine transitions are driven by four boolean methods you implement:

```javascript
_entryConditionBuilding(signals) {
  // Conditions starting to form — not ready to deploy capital yet
  // Example: price above SMA20 but volume not confirmed
  return signals.priceAboveSma20 && !signals.volumeSpike;
}

_entryConditionMet(signals) {
  // ALL conditions aligned — ready to deploy capital
  // This is the strictest gate. False positives cost money.
  return signals.priceAboveSma20 && signals.volumeSpike && !signals.fearGreedHigh;
}

_conditionsDeteriorated(signals) {
  // Conditions have broken down — retreat to safe state
  return signals.fearGreedLow || !signals.priceAboveSma20;
}

_exitConditionMet(signals, data) {
  // Position should be closed
  // Check stop loss, take profit, trailing stop, time exit
  return signals.fearGreedHigh || data.price < this.entryPrice * 0.95;
}
```

---

## Storage

Every engine gets its own `sql.js` SQLite database. This is pure JavaScript SQLite — it works on Android/Termux without native compilation.

The template creates four tables automatically:

```sql
cycles      — one row per runCycle() call
transitions — one row per state change
trades      — one row per executed trade
errors      — one row per caught exception
```

**Important:** Never use `better-sqlite3` or native `sqlite3`. They won't compile on Android. Always use `sql.js` with the async init pattern:

```javascript
async _init() {
  const SQL = await initSqlJs();  // await is required
  this.db = fs.existsSync(this.dbPath)
    ? new SQL.Database(fs.readFileSync(this.dbPath))
    : new SQL.Database();
}
```

---

## The Circuit Breaker

Every engine has a built-in circuit breaker that fires when the daily loss exceeds `maxDailyLoss` (default 3%):

```
1. circuitBroken = true
2. currentState  = EMERGENCY state
3. Telegram notification sent
4. All subsequent cycles skipped
5. Resets automatically at midnight (daily reset)
```

---

## The Manifest

`manifest.json` tells the registry everything it needs to load the engine:

```json
{
  "id":          "se-forex",
  "name":        "S.E Forex EUR/USD",
  "version":     "1.0.0",
  "type":        "STRATEGIC",
  "ecosystem":   "S.E",
  "cycle":       "4H",
  "capitalKey":  "seForex",
  "author":      "Your Name",
  "description": "One sentence describing this engine.",
  "requires": {
    "exchange":  true,
    "notifier":  true,
    "config":    true
  }
}
```

- `id` — kebab-case, no spaces. Used in CLI and API.
- `capitalKey` — camelCase key into `config.js` for this engine's settings.
- `type` — `STRATEGIC` (S.E), `TACTICAL` (T.E), or `OBSERVER` (O.E).
- `ecosystem` — `S.E`, `T.E`, or `O.E`.
- `cycle` — interval hint for the registry: `5min`, `1H`, `4H`, `24H`, `Weekly`.

---

## The Engine Registry

The registry scans `engines/` on boot, loads all valid engines, and registers them with the platform. It runs 8 checks per engine:

```
1. manifest.json exists
2. manifest.json parses as valid JSON
3. All required manifest fields present
4. type and ecosystem are valid values
5. engine.js exists
6. engine.js requires without error
7. All 5 interface methods exist
8. dryRun defaults to true
```

Any failure → engine skipped, error logged, platform continues.

---

## The Layer Registry

AI layers attach to engine events via hooks. Layers live in `ai-layers/` and are auto-detected the same way engines are.

Three hook types:
- `post_cycle` — fires after every engine cycle
- `on_transition` — fires on every state change
- `on_signal` — fires when signals are computed

Three layer patterns:
- `OBSERVER` — snapshot and record
- `ANALYST` — read accumulated data, generate recommendations
- `SENTINEL` — detect anomalies, fire alerts

---

## The G.O Orchestrator

G.O is the fourth intelligence layer. It sits above all engines, reads Strategist recommendations, and manages capital ceilings.

**Current mode: ADVISORY (Tier 1)**
G.O observes and logs recommendations. No capital changes until operator enables Tier 2.

**Activation requirements:**
- O.E Observer running with 96+ cycles
- O.E Strategist running with at least one recommendation
- No active Sentinel ALERT
- `config.go.enabled = true`

**The capital ceiling model:**
G.O writes `data/go-ceilings.json`. Each engine reads its ceiling at the start of every cycle via `GOCeilingReader.getCeiling(engineId)`. G.O never touches engine state, engine databases, or engine config.

**The eight golden rules:**
1. Never places orders — no exchange connector
2. Never modifies engine state — no FSM calls
3. Never writes to engine databases
4. Never acts on fewer than 96 observations
5. Never adjusts S.E Crypto live without `allowLiveAdjust: true`
6. Never reduces total platform capital below 60%
7. Every action logged with full reasoning
8. Always disableable via `config.go.enabled = false`
