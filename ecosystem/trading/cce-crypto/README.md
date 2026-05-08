# ⚡ CASCADE COMPOUNDING ENGINE (CCE)
### Autonomous Trading Operating System — Giblets Creations

**Author:** James Gilbert / Giblets Creations
**Version:** 2.4.0
**Status:** 🔴 Live · March 2026
**Exchange:** Kraken (primary)

---

> *"I wanted it. So I forged it. Now forge yours."*

---

## What Is CCE?

The Cascade Compounding Engine is a fully autonomous trading operating
system built from scratch. It runs 24/7 on a Samsung S24 Ultra via
Termux and on a Hetzner VPS in Helsinki. It hosts 21 independent
trading and intelligence engines across three ecosystems, managed by PM2.

**Live since:** 13 March 2026
**Starting capital:** £300
**Real Kraken balance:** $521.83
**Simulated portfolio:** $813.54
**Exchange:** Kraken (all active engines)
**VPS:** 65.21.244.131 (client instances)

---

## The Platform
CCE Platform v2.4.0
├── S.E — Strategic Engines    (8 engines — Kraken)
├── T.E — Tactical Engines     (4 engines — Kraken)
├── O.E — Observer Engines     (3 engines — passive intelligence)
├── Intelligence Layer         (G.O Orchestrator + Weather Engine)
├── Supervision Layer          (F.L + AUDIT + CSS Siphon)
└── CCE Control                (port 3002 — client management)
---

## S.E — Strategic Engines (Kraken)

Patient engines that wait for macro conditions before deploying capital.

| Engine | Market | Cycle | State | Mode |
|--------|--------|-------|-------|------|
| S.E Crypto | BTC/USDC | 4H | DORMANT | 🔴 LIVE |
| S.E Fear Fade | BTC/USDC | 4H | WATCHING | 🔵 DRY RUN |
| S.E GoldForge | XAUT/USDT | 4H | WATCHING | 🔵 DRY RUN |
| S.E Alt Season | ETH/SOL/USDC | 4H | DORMANT | 🔵 DRY RUN |
| S.E Underdog | ALGO/DOT/ATOM/VET | 4H | DORMANT | 🔵 DRY RUN |
| S.E Pulse | BTC/USDC | 4H | SCANNING | 🔵 DRY RUN |

---

## T.E — Tactical Engines (Kraken)

Active engines that harvest market motion continuously.

| Engine | Strategy | Cycle | State | Mode |
|--------|----------|-------|-------|------|
| T.E Grid | BTC/USDC grid | 5min | ACTIVE | 🔵 DRY RUN |
| T.E Momentum | EMA crossover | 2H | STANDBY | 🔵 DRY RUN |
| T.E Breakout | Bollinger squeeze | 1H | SCANNING | 🔵 DRY RUN |
| T.E Scalp | RSI + volume | 5min | IDLE | 🔵 DRY RUN |

---

## O.E — Observer Engines

Passive intelligence — no trading, pure observation.

| Engine | Purpose | Cycle | State |
|--------|---------|-------|-------|
| O.E Observer | Cross-engine snapshots | 15min | 🟢 ACTIVE |
| O.E Sentinel | Anomaly detection (17 engines) | 15min | 🟢 ACTIVE |
| O.E Strategist | Pattern analysis | 1H | 🟢 ACTIVE |

---

## Intelligence Layer

| Layer | Purpose | Cycle | State |
|-------|---------|-------|-------|
| G.O Orchestrator | Capital ceiling recommendations | 1H | 🟢 ADVISORY |
| Weather Engine | Agricultural commodity signals | 6H | 🟢 ACTIVE |

---

## Supervision Layer (Cron)

| Layer | Purpose | Schedule |
|-------|---------|----------|
| F.L Forensic Layer | Trade autopsy — 9 engines | Monday 9am |
| AUDIT | System health monitoring | Daily 8am |
| CSS Capital Siphon | Profit skimming (10/12/15% tiered) | Daily midnight |

---

## Archived Engines (broker/exchange required)

These engines are built and documented but disabled pending broker setup.

| Engine | Market | Needs |
|--------|--------|-------|
| S.E Forex | EUR/USD | IG / OANDA |
| S.E REIT | O Realty | IG / Trading212 |
| S.E Stocks | SPY | IG / Trading212 |
| S.E Commodities | Oil/Gold | IG / Trading212 |
| S.E EGP | USD/EGP | Manual |
| T.E LCE | BTC/ETH/SOL futures | Binance Futures |

Re-enable: set `enabled: true` in `config.js`

---

## Philosophy

**S.E engines are weather vanes** — they point in the direction of
the macro wind. They wait for conditions to align, then act with
conviction. They do not predict. They observe.

**T.E engines are waterwheels** — they extract energy from market
flow regardless of direction. The market is always moving. T.E
engines harvest that motion.

**O.E engines are memory** — they watch everything, record
everything, and build the dataset that powers G.O intelligence.

**G.O is the architect** — it reads all engine behaviour and
computes optimal capital allocation. Advisory only until the
operator opts in to autonomous control.

---

## Architecture

- **Runtime:** Node.js v22 via Termux (Android) + Hetzner VPS
- **Process:** PM2 (cce-bot, dashboard, cce-control + crons)
- **Storage:** sql.js (pure JS SQLite — one DB per engine)
- **Notifications:** Telegram Bot
- **Exchange:** Kraken via CCXT
- **Engine loading:** Auto-registry from `/engines/` directory
- **Dashboard:** Express on port 3000
- **CCE Control:** Express on port 3002

---

## Access
localhost:3000              Main dashboard (S24)
localhost:3002              CCE Control — client management
65.21.244.131               VPS dashboard (public)
---

## Client Tiers

| Tier | Setup Fee | Engines | Exchange |
|------|-----------|---------|----------|
| 🟠 Starter | £200 | 11 engines | Kraken |
| 🟡 Advanced | £300 | 12 engines | + Binance |
| 🟢 Full | £500 | 17 engines | + Broker |

Siphon: 10% (0-50% return) · 12% (50-100%) · 15% (100%+)

---

## Capital Allocation (Current)

| Engine | Capital | Mode |
|--------|---------|------|
| S.E Crypto | $521.83 | 🔴 LIVE |
| T.E Grid | $125 | DRY RUN |
| T.E Momentum | $125 | DRY RUN |
| T.E Breakout | $100 | DRY RUN |
| T.E Scalp | $100 | DRY RUN |
| S.E Pulse | $150 | DRY RUN |
| S.E Fear Fade | $100 | DRY RUN |
| S.E GoldForge | $100 | DRY RUN |
| S.E Alt Season | $100 | DRY RUN |
| S.E Underdog | $200 | DRY RUN |

---

## Safety

- All engines default to `dryRun: true`
- Circuit breakers on all engines (daily loss limits)
- G.O advisory only — never places orders autonomously
- Pre-flight strategy tests on every boot
- Licence validation on startup
- SSH key only access to VPS

---

## Documentation (36 docs)

| Document | Description |
|----------|-------------|
| CHANGELOG.md | Version history |
| ENGINE_REGISTRY.md | Auto-loader system |
| TIER_SYSTEM.md | Client tiers |
| SE_ENGINES_KRAKEN.md | S.E engine details |
| SE_PULSE.md | S.E Pulse engine |
| TE_SCALP.md | T.E Scalp engine |
| VPS_DEPLOYMENT.md | Server setup |
| VPS_ONBOARDING.md | Client onboarding |
| CCE_CONTROL.md | Client management |
| SERVICE_AGREEMENT.md | Client contract |
| docs/ | Full documentation bundle |

---

*Giblets Creations · v2.4.0 · March 2026*
*"I wanted it. So I forged it. Now forge yours."*
