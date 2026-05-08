# CCE Platform Dashboard Guide

**URL:** `http://localhost:3000`
**Forge HQ:** `http://localhost:3000/forge`
**Version:** 2.3.0

The dashboard is your mission control for the entire CCE platform.
Two interfaces are available — the Command Dashboard and Forge HQ.

---

## Command Dashboard (`/`)

The full technical view. Real-time engine states, market context,
transitions, and live spark charts.

---

### Header Bar

The top bar shows live platform-wide data updated every 30 seconds:

| Field | Description |
|-------|-------------|
| CCE · LIVE/DRY | Platform mode indicator |
| v2.3 | Platform version |
| BTC | Live Bitcoin price (CoinGecko) |
| F&G | Fear & Greed Index (0-100) |
| DOM | BTC Dominance % |
| DXY | US Dollar Index |
| PORT | Live portfolio value (S.E Crypto) |

---

### S.E — Strategic Engines Panel

Shows all 6 Strategic Engines in a table. Each row shows:

| Column | Description |
|--------|-------------|
| ENG | Engine identifier (CRY/FX/REIT/STK/COM/EGP) |
| STATE | Current FSM state (colour coded) |
| KEY 1 | Primary metric (portfolio value or rate) |
| KEY 2 | Secondary metric (price or yield) |
| KEY 3 | Tertiary signal (F&G, VIX, DXY etc.) |

**State colours:**
- Grey — DORMANT (holding cash, waiting)
- Yellow/Amber — WATCHING or ACCUMULATION (conditions building)
- Green — ACTIVE, IGNITION, RISK_ON (deployed)
- Red — CAUTION, EXTRACTION, EMERGENCY (defensive)
- Blue — CASCADE, PRIMED (transitioning)

Click any engine row to open its detail modal.

---

### Market Context Panel

Live macro data feeding all engines:

**Left column:** BTC price, Fear & Greed, BTC Dominance, DXY, SPY, VIX

**Right column:** Oil (WTI), Gold, Fed Rate, 10Y Treasury Yield,
O REIT price, CBE Rate (EGP)

Each value shows a short label indicating the current regime
(e.g. SURGING, CUTTING, BEARISH, ELEVATED).

---

### T.E + O.E Panel (7 Engines)

Shows all Tactical and Observer engines as cards:

**T.E GRID** — Grid trading status
- CAP: Capital deployed
- P&L: Profit/loss
- ORD: Open orders
- CYC: Completed cycles
- CTR: Grid centre price

**T.E MOM** — Momentum engine
- CAP: Capital
- P&L: Total PnL
- TRD: Total trades
- WIN: Win rate

**T.E BRK** — Breakout engine
- CAP: Capital
- P&L: Total PnL
- TRD: Total trades
- SQ: Active Bollinger squeezes detected

**T.E LCE** — Liquidation Cascade Engine
- CAP: Capital ($100 USDC)
- P&L: Daily PnL %
- TRD: Daily trades
- WIN: Win rate %

**O.E OBS** — Observer engine
- OBS: Total observations logged
- UNTIL: Observations until next pattern analysis
- TRANS: Transitions logged
- PAT: Patterns identified

**O.E STR** — Strategist engine
- Enabled after 96 observations (~24 hours)
- Shows recommendation status when active

**O.E SEN** — Sentinel engine
- ANOM: Active anomalies
- WARN: Warning count
- ALRT: Alert count
- TOT: Total anomalies detected
- Click to open Sentinel modal with full anomaly detail

---

### Recent Transitions

Log of all state transitions across all engines. Shows:
- Time of transition
- Engine that transitioned
- From state → To state
- Trigger condition

---

### Spark Charts

Four live mini-charts at the bottom:
- BTC price (24H)
- Fear & Greed (24H)
- SPY · VIX×10 (comparative)
- OIL · GOLD÷10 (comparative)

---

## Forge HQ (`/forge`)

PWA-installable command centre. Install to home screen for quick
access. Shows the same data in a more visual card layout.

Each engine has its own widget card showing state, capital, and
key metrics. Sentinel shows as an expandable alert panel at the
bottom.

---

## API Endpoints

All data is available via REST API:

### S.E Endpoints
```
GET /api/status          S.E Crypto latest cycle
GET /api/history         S.E Crypto cycle history
GET /api/transitions     State transition log
GET /api/trades          S.E Crypto trade history
GET /api/forex/status    S.E Forex status
GET /api/rme/status      S.E REIT status
GET /api/rme/trades      S.E REIT trade history
GET /api/cme/status      S.E Stocks status
GET /api/cme/trades      S.E Stocks trade history
GET /api/como/status     S.E Commodities status
GET /api/como/trades     S.E Commodities trade history
GET /api/egp/status      S.E EGP status
GET /api/egp/transitions S.E EGP transition history
```

### T.E Endpoints
```
GET /api/grid/status     T.E Grid status
GET /api/grid/orders     T.E Grid open orders
GET /api/grid/completed  T.E Grid completed cycles
GET /api/mom/status      T.E Momentum status
GET /api/mom/trades      T.E Momentum trade history
GET /api/brk/status      T.E Breakout status
GET /api/brk/trades      T.E Breakout trade history
GET /api/lce/status      T.E LCE status
GET /api/lce/trades      T.E LCE trade history
```

### O.E Endpoints
```
GET /api/obs/status         O.E Observer status
GET /api/obs/observations   Recent observations
GET /api/sentinel/status    O.E Sentinel anomalies
GET /api/dxy/status         DXY layer state
```

### Utility Endpoints
```
GET  /api/ticker            Live BTC price + Fear & Greed
GET  /api/stream            SSE real-time crypto stream
GET  /api/history/all       Multi-engine history export
GET  /api/export            Full platform data export
POST /api/emergency-stop    Kill switch (token protected)
```

---

## Emergency Stop

A kill switch is available at `POST /api/emergency-stop`.

If `DASHBOARD_STOP_TOKEN` is set in `.env`, the request must
include the token in the `x-stop-token` header. This stops
the `cce-bot` PM2 process immediately.

---

*Giblets Creations · Internal Documentation · Not for distribution*
*"I wanted it. So I forged it. Now forge yours."*
