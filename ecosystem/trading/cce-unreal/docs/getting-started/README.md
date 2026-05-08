# Getting Started

## Prerequisites

- Node.js (already installed if CCE is running)
- PM2 (`npm install -g pm2`)
- Termux on Android, or any Linux/Mac terminal
- `cce` CLI installed (`npm link` from `~/cce-crypto`)

---

## 1. Verify the Platform is Running

```bash
pm2 ls
# Should show cce-bot (online) and dashboard (online)

cce list
# Should show registered engines

curl -s http://localhost:3000/api/registry/overview
# Should return JSON with engineCount
```

---

## 2. Access the Platform

Open your browser and navigate to:

- **Marketplace** — `http://localhost:3000/marketplace`
- **Visual Builder** — `http://localhost:3000/forge/builder`
- **Backtest Replay** — `http://localhost:3000/forge/replay`

On Android, these open in Chrome. Add to home screen for a PWA experience.

---

## 3. Create Your First Engine

### Option A — Visual Builder (no code)

1. Open `http://localhost:3000/forge/builder`
2. Type your engine ID in the top bar (e.g. `te-myfirst`)
3. Tap **RISK OFF** in the bottom bar — a DORMANT node appears
4. Tap **TRANSITION** — a WATCHING node appears
5. Tap **RISK ON** — an ACTIVE node appears
6. Tap **EMERGENCY** — an EXTRACTION node appears
7. Drag from the right port of DORMANT to the left port of WATCHING to connect them
8. Repeat for all transitions
9. Tap each node to open the inspector and set:
   - Entry condition (e.g. `fg() > 40 AND above_sma(20)`)
   - Exit condition (e.g. `fg() < 25`)
   - Portfolio allocations (e.g. BTC 100%)
10. Watch the contract checker tick green as requirements are met
11. Tap **⚡ FORGE**

### Option B — CLI (code-first)

```bash
# Scaffold the engine
cce new-engine te-myfirst --type tactical --cycle 1H

# This creates engines/te-myfirst/ with:
#   engine.js      — lifecycle, circuit breaker, runCycle wrapper
#   strategy.js    — FSM logic (you implement 4 methods)
#   storage.js     — sql.js database schema
#   manifest.json  — engine identity
#   README.md      — documentation stub

# Open and implement the three required methods in engine.js:
#   _fetchData()        — fetch market data, return object or null
#   _evaluateSignals()  — compute signals from data, return object
#   _executeDecision()  — act on current state (check dryRun first)

# And four FSM methods in strategy.js:
#   _entryConditionBuilding()   — conditions starting to form
#   _entryConditionMet()        — all conditions aligned
#   _conditionsDeteriorated()   — retreat to safe state
#   _exitConditionMet()         — close position

# Add config block to config.js:
# teMyfirst: {
#   enabled: true,
#   dryRun: true,
#   capitalUSDC: 100,
#   intervalMinutes: 60,
#   maxDailyLoss: 0.03,
# }

# Validate
cce validate te-myfirst

# Restart to load it
pm2 restart cce-bot

# Verify it loaded
cce list
```

---

## 4. Watch it Run

Once loaded, the engine appears in:

- `cce list` — shows state and type
- `/api/registry/overview` — full JSON status
- Forge HQ dashboard (if you have it installed)

```bash
# Watch the logs
pm2 logs cce-bot 2>&1 | grep te-myfirst
```

---

## 5. Run a Backtest

Open the replay at `http://localhost:3000/forge/replay` and hit **DEMO** to see a pre-built 5-year BTC strategy play back. To replay your own engine's backtest:

1. Run the pipeline against your strategy (see [Pipeline Guide](../guides/pipeline.md))
2. The pipeline outputs `pipeline/runs/<timestamp>/replay.json`
3. On the replay page, tap **LOAD REPLAY** and select the file

---

## 6. Deploy to VPS (when ready)

```bash
# One-time setup
cce-deploy setup
# Enter: host, SSH user, SSH key path, remote CCE path, PM2 process name

# Deploy
cce-deploy push te-myfirst

# Monitor
cce-deploy logs te-myfirst
cce-deploy status
```

---

## Golden Rules

1. **Always start in dry run** — `dryRun: true` is the default. Never change it until you have 7+ cycles of clean operation.
2. **Validate before you restart** — `cce validate <id>` catches interface errors before they crash PM2.
3. **Watch the Observer** — The O.E Observer is building intelligence. Enable the Strategist after 96 cycles.
4. **Keep allocations summing to 100%** — The contract checker enforces this. Weights that don't sum to 100% fail the gate.
5. **Never remove the EMERGENCY state** — Every engine needs one. It's the last line of defence.

---

## Next Steps

- [Framework SDK](../framework/README.md) — Understand the engine contract in depth
- [CLI Reference](../cli/README.md) — Full command documentation
- [Building a Forex Engine](../guides/forex-engine.md) — End-to-end walkthrough using `se-forex`
