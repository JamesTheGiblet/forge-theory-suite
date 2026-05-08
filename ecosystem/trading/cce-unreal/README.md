# ⚡ CASCADE COMPOUNDING ENGINE (CCE)
### Autonomous Trading Operating System — Giblets Creations

**Author:** James Gilbert / Giblets Creations
**Version:** 2.3.0
**Status:** Live · March 2026

---

> *"I wanted it. So I forged it. Now forge yours."*

---

## What Is CCE?

The Cascade Compounding Engine is a fully autonomous trading operating
system built from scratch and running 24/7 on a Samsung S24 Ultra via
Termux. It hosts 11 independent trading and intelligence engines across
three ecosystems, all managed by a single PM2 process.

No cloud. No VPS. No subscription. One phone.

---

## The Platform

```
CCE Platform v2.3.0
├── S.E — Strategic Engines    (6 engines — patient, macro-driven)
├── T.E — Tactical Engines     (4 engines — active, mechanical)
└── O.E — Observer Engines     (3 engines — passive intelligence)
```

---

## S.E — Strategic Engines

Patient engines that wait for macro conditions to align before
deploying capital. Timeframes range from 1 hour to weekly.

| Engine | Market | Cycle | State |
|--------|--------|-------|-------|
| S.E Crypto | BTC · ETH · SOL · RNDR · FET | 4H | 🟢 LIVE |
| S.E Forex | EUR/USD | 1H | 🔵 DRY RUN |
| S.E REIT | O Realty (REITs) | 24H | 🔵 DRY RUN |
| S.E Stocks | SPY (Equities) | 24H | 🔵 DRY RUN |
| S.E Commodities | Oil → Gold → Copper | 24H | 🔵 DRY RUN |
| S.E EGP | USD/EGP (Emerging FX) | Weekly | 🔵 DRY RUN |

---

## T.E — Tactical Engines

Active engines that harvest opportunity continuously regardless of
macro environment. Timeframes from 5 minutes to 2 hours.

| Engine | Strategy | Cycle | State |
|--------|----------|-------|-------|
| T.E Grid | BTC/USDC grid trading | 5min | 🔵 DRY RUN |
| T.E Momentum | EMA momentum, BTC/ETH/SOL | 2H | 🔵 DRY RUN |
| T.E Breakout | Bollinger Band squeeze | 1H | 🔵 DRY RUN |
| T.E LCE | Liquidation cascade riding | 5min | 🔵 DRY RUN |

---

## O.E — Observer Engines

Passive intelligence layer. These engines do not trade. They watch,
record, and alert.

| Engine | Purpose | Cycle | State |
|--------|---------|-------|-------|
| O.E Observer | Cross-engine snapshots, pattern logging | 15min | 🟢 ACTIVE |
| O.E Sentinel | Anomaly detection, cross-engine alerts | 15min | 🟢 ACTIVE |
| O.E Strategist | Pattern analysis, recommendations | 1H | ⏳ WAITING |

---

## Philosophy

**S.E engines are weather vanes** — they point in the direction of
the macro wind. They wait for conditions to align, then act with
conviction. They do not predict. They react.

**T.E engines are waterwheels** — they extract energy from market
flow regardless of direction. Grid levels, momentum, volatility
squeezes, liquidation cascades. The market is always moving.
T.E engines harvest that motion.

**O.E engines are memory** — they watch everything, record
everything, and build the dataset that will eventually power
autonomous cross-engine intelligence. They never interfere.

---

## Architecture

- **Runtime:** Node.js v22 via Termux (Android)
- **Process:** PM2 daemon (2 processes — cce-bot + dashboard)
- **Storage:** sql.js (pure JS SQLite, Android compatible)
- **Notifications:** Telegram Bot (engine-prefixed alerts)
- **Dashboard:** Express server on port 3000 (PWA installable)
- **Capital:** Kraken (live crypto), paper trading (all others)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full technical detail.

---

## Dashboard

Two interfaces available at `localhost:3000`:

**Command Dashboard** (`/`) — Full engine status grid, market
context panel, recent transitions, live spark charts.

**Forge HQ** (`/forge`) — PWA-installable command centre.
Installable to home screen. Shows all engine states, capital
deployed, live market data, and Sentinel alerts.

---

## Ecosystem Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full technical architecture |
| [SE-ECOSYSTEM.md](./SE-ECOSYSTEM.md) | Strategic Engine ecosystem |
| [TE-ECOSYSTEM.md](./TE-ECOSYSTEM.md) | Tactical Engine ecosystem |
| [OE-ECOSYSTEM.md](./OE-ECOSYSTEM.md) | Observer Engine ecosystem |
| [PHILOSOPHY.md](./PHILOSOPHY.md) | Platform philosophy and principles |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| [docs/](./docs/) | Full documentation bundle |

---

## Quick Start

```bash
# Clone or transfer to device
cd ~/cce-crypto

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Add API keys, Telegram token

# Start platform
pm2 start index.js --name cce-bot
pm2 start dashboard-server.js --name dashboard
pm2 save

# View logs
pm2 logs cce-bot --lines 50

# Open dashboard
# Navigate to localhost:3000 in browser
```

---

## Capital Allocation

| Engine | Capital | Mode |
|--------|---------|------|
| S.E Crypto | $291.70 | LIVE (Kraken) |
| S.E Forex | £300.00 | DRY RUN |
| S.E REIT | £300.00 | DRY RUN |
| S.E Stocks | £300.00 | DRY RUN |
| S.E Commodities | $300.00 | DRY RUN |
| T.E Grid | $125.00 | DRY RUN |
| T.E Momentum | $125.00 | DRY RUN |
| T.E Breakout | $100.00 | DRY RUN |
| T.E LCE | $100.00 | DRY RUN |

**Total deployed:** ~£1,430 across all engines

---

## Safety

- All engines default to DRY RUN — no real trades without explicit config
- Circuit breakers on all T.E engines (daily loss limits)
- Emergency stop endpoint (`POST /api/emergency-stop`)
- Licence validation on startup (Gumroad)
- Pre-flight strategy tests on every boot (31 tests)

---

*Giblets Creations · Internal Documentation*
*"I wanted it. So I forged it. Now forge yours."*
