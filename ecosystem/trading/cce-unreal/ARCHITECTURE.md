# ARCHITECTURE.md
### CCE Platform Core — Technical Architecture

**Giblets Creations · Internal · March 2026**

---

## Overview

The CCE Platform runs as a single Node.js process hosting 11 independent
engines in parallel across three ecosystems: Strategic (S.E), Tactical (T.E),
and Observer (O.E). Each engine is a self-contained module with its own state
machine, data feed, storage layer, and decision logic. They share only two
things: the notification service and the process runtime.

---

## Process Architecture

```
PM2 Process Manager
├── cce-bot (Node.js — index.js)
│   │
│   ├── S.E STRATEGIC ENGINES
│   │   ├── S.E Crypto         (cce-engine.js)         4H cycle
│   │   ├── S.E Forex          (cce-forex-engine.js)   1H cycle
│   │   ├── S.E REIT           (cce-rme-engine.js)     24H cycle
│   │   ├── S.E Stocks         (cce-cme-engine.js)     24H cycle
│   │   ├── S.E Commodities    (cce-como-engine.js)    24H cycle
│   │   └── S.E EGP            (cce-egp-engine.js)     Weekly cycle
│   │
│   ├── T.E TACTICAL ENGINES
│   │   ├── T.E Grid           (cce-grid-engine.js)    5min cycle
│   │   ├── T.E Momentum       (cce-mom-engine.js)     2H cycle
│   │   ├── T.E Breakout       (cce-brk-engine.js)     1H cycle
│   │   └── T.E LCE            (cce-lce-engine.js)     5min cycle
│   │
│   ├── O.E OBSERVER ENGINES
│   │   ├── O.E Observer       (cce-obs-engine.js)     15min cycle
│   │   ├── O.E Strategist     (cce-str-engine.js)     1H cycle
│   │   └── O.E Sentinel       (cce-sentinel-engine.js) 15min cycle
│   │
│   └── SHARED SERVICES
│       ├── Notification Service (notification.js)
│       ├── DXY Layer            (dxy-layer.js)
│       └── Exchange Connector   (exchange-connector.js)
│
└── dashboard (dashboard-server.js — port 3000)
    ├── API endpoints (per engine)
    ├── SSE real-time stream
    ├── Forge HQ PWA (/forge)
    └── Static dashboard (/)
```

---

## Ecosystem Roles

### S.E — Strategic Engines
Patient, macro-driven engines that hold positions for days or weeks.
They wait for environmental conditions to align before deploying capital.
Each S.E engine implements a multi-state FSM driven by macro signals.

### T.E — Tactical Engines
Active, mechanical engines that cycle capital continuously regardless
of macro environment. They exploit market microstructure — grid levels,
momentum, volatility squeezes, and liquidation cascades. Timeframes
range from 5 minutes to 2 hours.

### O.E — Observer Engines
Passive intelligence layer. Observer engines do not trade. They monitor
all other engines, detect cross-engine anomalies, log market observations,
and generate strategic recommendations. Sentinel fires alerts when
something looks wrong across the platform.

---

## Engine Architecture Pattern

Every engine follows the same structural pattern:

```
Engine (cce-[name]-engine.js)
├── Constructor      — accepts (config, sharedNotifier)
├── start(interval)  — begins the engine loop, returns a Promise
├── stop()           — graceful shutdown
├── runCycle()       — single execution unit
├── State Machine    — FSM with defined states and transition rules
├── Data Feed        — market data acquisition and normalisation
└── Storage          — sql.js persistence (Android compatible)
```

### State Machine Pattern

Every engine implements a Finite State Machine (FSM):
- Holds a current state
- Evaluates transition conditions on each cycle
- Transitions between states when conditions are met
- Never acts outside defined state transitions
- Logs every transition to storage

### Storage Pattern

All engines use sql.js (pure JavaScript SQLite) for persistence.
Native SQLite bindings do not compile on Android — sql.js is required
for Termux compatibility.

```
data/
├── cce-production.db      S.E Crypto
├── rme-production.db      S.E REIT
├── cme-production.db      S.E Stocks
├── como-production.db     S.E Commodities
├── grid-production.db     T.E Grid
├── mom-production.db      T.E Momentum
├── brk-production.db      T.E Breakout
├── egp-production.db      S.E EGP
├── obs-production.db      O.E Observer
├── sentinel-production.db O.E Sentinel
└── lce.db.json            T.E LCE (JSON fallback)
```

---

## Cycle Timing

| Engine | Interval | Rationale |
|--------|----------|-----------|
| S.E Crypto | 4 hours | Aligns with 4H candles |
| S.E Forex | 1 hour | Session-aware, 1H structure |
| S.E REIT | 24 hours | Daily rate environment data |
| S.E Stocks | 24 hours | Daily close data |
| S.E Commodities | 24 hours | Daily commodity prices |
| S.E EGP | Weekly | CBE meeting cadence |
| T.E Grid | 5 minutes | Grid level monitoring |
| T.E Momentum | 2 hours | 2H candle structure |
| T.E Breakout | 1 hour | BB squeeze detection |
| T.E LCE | 5 minutes | Liquidation window |
| O.E Observer | 15 minutes | Cross-engine snapshot |
| O.E Sentinel | 15 minutes | Anomaly detection |
| O.E Strategist | 1 hour | Pattern analysis |

---

## Data Sources

| Source | Used By |
|--------|---------|
| Kraken API (CCXT) | S.E Crypto, T.E Grid, T.E Momentum, T.E Breakout, T.E LCE |
| Binance Futures API | T.E LCE (liquidation stream, OI data) |
| Yahoo Finance | S.E Forex, S.E Stocks, S.E Commodities |
| Alpha Vantage | S.E REIT (Fed rate, Treasury yield) |
| CoinGecko | S.E Crypto (BTC dominance) |
| Fear & Greed Index | S.E Crypto, O.E Observer |
| CBE Manual Input | S.E EGP |
| DXY Layer | S.E Commodities modifier |

---

## Notification Architecture

All engines share a single Telegram bot with engine-prefixed messages:

```
[no prefix]  → S.E Crypto
[FOREX]      → S.E Forex
[RME]        → S.E REIT
[CME]        → S.E Stocks
[COMO]       → S.E Commodities
[EGP]        → S.E EGP
[GRID]       → T.E Grid
[MOM]        → T.E Momentum
[BRK]        → T.E Breakout
[LCE]        → T.E LCE
[OBS]        → O.E Observer
[SEN]        → O.E Sentinel
[STR]        → O.E Strategist
```

---

## Dashboard Architecture

```
Express Server (port 3000)
├── GET /                     → Command dashboard (index.html)
├── GET /forge                → Forge HQ PWA (forge-hq.html)
│
├── S.E ENDPOINTS
│   ├── GET /api/status       → S.E Crypto latest cycle
│   ├── GET /api/history      → S.E Crypto cycle history
│   ├── GET /api/transitions  → State transition log
│   ├── GET /api/trades       → S.E Crypto trade history
│   ├── GET /api/forex/status → S.E Forex status
│   ├── GET /api/rme/status   → S.E REIT status
│   ├── GET /api/cme/status   → S.E Stocks status
│   ├── GET /api/como/status  → S.E Commodities status
│   └── GET /api/egp/status   → S.E EGP status
│
├── T.E ENDPOINTS
│   ├── GET /api/grid/status  → T.E Grid status
│   ├── GET /api/mom/status   → T.E Momentum status
│   ├── GET /api/brk/status   → T.E Breakout status
│   └── GET /api/lce/status   → T.E LCE status
│
├── O.E ENDPOINTS
│   ├── GET /api/obs/status   → O.E Observer status
│   ├── GET /api/sentinel/status → O.E Sentinel anomalies
│   └── GET /api/dxy/status   → DXY layer state
│
├── UTILITY
│   ├── GET /api/ticker       → Live BTC price + F&G
│   ├── GET /api/stream       → SSE real-time crypto stream
│   ├── GET /api/export       → Full platform data export
│   └── POST /api/emergency-stop → Kill switch (token protected)
```

---

## Infrastructure

```
Device:     Samsung S24 Ultra
OS:         Android 14
Runtime:    Node.js v22 via Termux
Process:    PM2 (daemon mode, 2 processes)
Storage:    sql.js (pure JS SQLite) + JSON fallback
Network:    Cloudflare Tunnel (remote dashboard access)
Alerts:     Telegram Bot API
Dashboard:  localhost:3000 (PWA installable)
```

---

## Resilience

PM2 handles process resilience:
- Auto-restart on crash
- Log rotation
- Startup on boot (pm2 startup + pm2 save)
- Graceful shutdown on SIGINT/SIGTERM

Each engine handles data feed failures gracefully:
- Caches last known good data
- Skips cycle on error rather than crashing
- Telegram alert on repeated failures
- Circuit breaker halts trading on excessive loss

---

## Current Platform State (March 2026)

| Engine | State | Mode |
|--------|-------|------|
| S.E Crypto | DORMANT | LIVE |
| S.E Forex | DORMANT | DRY RUN |
| S.E REIT | WATCHING | DRY RUN |
| S.E Stocks | DORMANT | DRY RUN |
| S.E Commodities | WATCHING | DRY RUN |
| S.E EGP | CAUTION | DRY RUN |
| T.E Grid | ACTIVE | DRY RUN |
| T.E Momentum | STANDBY | DRY RUN |
| T.E Breakout | SCANNING | DRY RUN |
| T.E LCE | DORMANT | DRY RUN |
| O.E Observer | ACTIVE | PASSIVE |
| O.E Sentinel | ALERT | PASSIVE |
| O.E Strategist | WAITING | DISABLED |

---

*Giblets Creations · Internal Documentation · Not for distribution*
*"I wanted it. So I forged it. Now forge yours."*
