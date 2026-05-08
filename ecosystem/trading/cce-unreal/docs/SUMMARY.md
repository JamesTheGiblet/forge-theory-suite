# CCE Unreal Platform — Quick Reference

---

## Command Cheat Sheet

```bash
# ── ENGINE MANAGEMENT ────────────────────────────────────────────
cce new-engine <id> [--type strategic] [--cycle 4H]
cce validate <id>
cce list

# ── CLOUD DEPLOY ─────────────────────────────────────────────────
cce-deploy setup
cce-deploy push <id>
cce-deploy list
cce-deploy logs <id>
cce-deploy stop <id>
cce-deploy rollback <id>
cce-deploy status

# ── PLATFORM ─────────────────────────────────────────────────────
pm2 ls
pm2 restart cce-bot
pm2 restart dashboard
pm2 restart all
pm2 logs cce-bot
cat ~/.pm2/logs/cce-bot-error.log | tail -30
cat ~/.pm2/logs/cce-bot-out.log | grep REGISTRY | tail -10

# ── PIPELINE ─────────────────────────────────────────────────────
node pipeline/cce-pipeline.js --target pipeline/targets/my.json
node pipeline/cce-pipeline.js --resume pipeline/runs/run_2026-03-25/
```

---

## Platform URLs

| URL | What it is |
|-----|-----------|
| `localhost:3000` | CCE Crypto dashboard |
| `localhost:3000/history` | Portfolio history |
| `localhost:3001` | CCE Unreal Platform |
| `localhost:3001/forge/builder` | Visual FSM editor |
| `localhost:3001/forge/replay` | Backtest replay |
| `localhost:3001/marketplace` | Engine marketplace |
| `localhost:3001/docs` | Documentation reader |
| `localhost:3001/api/registry/overview` | Live engine registry |
| `localhost:3001/api/health` | Health check |

---

## File Structure

```
~/cce-crypto/
├── index.js                      ← Main bot entry point (CCE engines)
├── config.js                     ← All engine configuration
├── dashboard-server.js           ← Express server (port 3000)
├── package.json
│
├── src/                          ← Core source
│   ├── cce-engine.js             ← S.E Crypto (LIVE)
│   ├── cce-forex-engine.js       ← S.E Forex
│   ├── cce-rme-engine.js         ← S.E RME
│   ├── cce-cme-engine.js         ← S.E CME
│   ├── cce-como-engine.js        ← S.E COMO
│   ├── cce-egp-engine.js         ← S.E EGP
│   ├── cce-grid-engine.js        ← T.E Grid
│   ├── cce-mom-engine.js         ← T.E Momentum
│   ├── cce-brk-engine.js         ← T.E Breakout
│   ├── cce-lce-engine.js         ← T.E LCE
│   ├── cce-obs-engine.js         ← O.E Observer
│   ├── cce-str-engine.js         ← O.E Strategist
│   ├── cce-sentinel-engine.js    ← O.E Sentinel
│   ├── engine-registry.js        ← ⚡ Framework: auto-detects engines/
│   ├── layer-registry.js         ← ⚡ Framework: auto-detects ai-layers/
│   ├── cce-go-engine.js          ← ⚡ G.O Orchestrator
│   ├── dashboard-registry-endpoints.js ← ⚡ Registry API endpoints
│   ├── forex-data-feed.js        ← Yahoo Finance EUR/USD feed
│   ├── data-feed.js              ← Kraken + F&G + CoinGecko feed
│   └── notification.js           ← Telegram notifier
│
├── engines/                      ← ⚡ Dynamic engine folder (auto-detected)
│   ├── _template/                ← Engine scaffold (skipped by registry)
│   │   ├── engine.js
│   │   ├── strategy.js
│   │   ├── storage.js
│   │   ├── manifest.json
│   │   └── README.md
│   └── se-forex/                 ← First framework engine (DRY RUN)
│
├── ai-layers/                    ← ⚡ Dynamic layer folder (auto-detected)
│   └── _template/                ← Layer scaffold
│
├── pipeline/                     ← ⚡ AI Framework Pipeline
│   ├── cce-pipeline.js           ← Pipeline runner (5 steps, gate enforcement)
│   ├── targets/                  ← Target spec JSON files
│   │   └── template.json
│   ├── steps/
│   │   ├── step1-target-definition.js
│   │   ├── step3-state-analysis.js
│   │   ├── step4-strategy-generation.js
│   │   └── step5-backtest-refinement.js
│   └── runs/                     ← Pipeline output (one folder per run)
│
├── bin/                          ← CLI tools
│   ├── cce.js                    ← cce new-engine / validate / list
│   └── cce-deploy.js             ← cce-deploy push / logs / status
│
├── public/                       ← Static frontend files
│   ├── forge/
│   │   ├── builder.html          ← Visual FSM editor
│   │   └── replay.html           ← Backtest replay
│   └── marketplace/
│       └── index.html            ← Engine marketplace
│
├── data/                         ← Runtime databases and state
│   ├── cce-production.db         ← S.E Crypto database
│   ├── obs-production.db         ← Observer database
│   └── go-ceilings.json          ← G.O capital ceilings
│
├── docs/                         ← ⚡ You are here
│   ├── README.md
│   ├── SUMMARY.md
│   ├── getting-started/
│   ├── framework/
│   ├── cli/
│   ├── marketplace/
│   ├── api/
│   └── guides/
│
└── tests/
    └── backtest.js               ← Existing backtest engine (used by Pipeline Step 5)
```

---

## Engine States

| State | Meaning | Capital |
|-------|---------|---------|
| `DORMANT` | Resting, waiting for conditions | 0% |
| `WATCHING` | Conditions building | 0–30% |
| `ACTIVE` / `IGNITION` | Deployed | 50–100% |
| `CASCADE` | Full deployment + compounding | 100% |
| `EXTRACTION` / `STOPPED` | Emergency exit | 0% |

---

## Config.js Block for se-forex

```javascript
seForex: {
  enabled:         true,
  dryRun:          true,
  capitalUSDC:     100,
  intervalMinutes: 240,
  maxDailyLoss:    0.03,
},
```

---

## G.O Config Block

```javascript
go: {
  enabled:          true,      // ACTIVATED — 403 Observer cycles confirmed
  dryRun:           true,      // never set false without testing
  tier2Enabled:     false,     // capital ceiling adjustments (opt-in)
  tier3Enabled:     false,     // pause/resume authority (explicit only)
  allowLiveAdjust:  false,     // allow S.E Crypto ceiling changes
  minCeilingPct:    0.20,
  maxCeilingPct:    2.00,
  maxSingleAdjust:  0.20,
  minPlatformPct:   0.60,
},
```

---

## The Platform Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Runtime + Framework SDK | ✅ Done | Engine contract, registries, CLI, pipeline, G.O |
| Visual Engine Builder | ✅ Done | Mobile FSM editor at `/forge/builder` |
| Backtest Replay | ✅ Done | Timeline player at `/forge/replay` |
| Cloud Deploy CLI | ✅ Done | `cce-deploy push <engine>` |
| Marketplace | ✅ Done | Engine listings at `/marketplace` |
| VPS | 🔵 Next | Enables multi-device, public access |
| First external user | 🔵 Month 2 | Marketplace live, payment flow active |
| Multi-user platform | Month 3+ | CCE as a service |

---

*CCE Unreal Platform v1.1.0 · Giblets Creations · March 2026*
*"I wanted it. So I forged it. Now forge yours."*
