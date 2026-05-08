# Portfolio History Page
### CCE Dashboard — `/history`

**URL:** `http://localhost:3000/history`
**Source:** `public/history.html`
**Route:** `GET /history` in `dashboard-server.js`
**Data:** `GET /api/history?limit=1000`

---

## Overview

The history page shows the complete portfolio value journey since the platform went live. It reads directly from `cce-production.db` — every cycle the S.E Crypto engine has logged.

---

## Features

### Summary Strip
Three numbers at the top:
- **Current** — latest portfolio value from database
- **Total Return** — percentage gain/loss from first recorded value
- **Cycles** — total number of recorded cycles

### Range Selector
Filter the chart by time window:
- 7D / 30D / 90D / 6M / 1Y / ALL

### Portfolio Chart
- Blue line chart showing portfolio value over time
- Downsampled to 60 points max for performance
- Axes show dollar values and dates

### BTC Price Overlay
Toggle the gold dashed line to show BTC price on a secondary axis.
Helps correlate portfolio performance with BTC price movement.

### State Legend
Colour reference for engine states:
- DORMANT / WATCHING / IGNITION / CASCADE / EXTRACTION

### Recent Cycles List
Shows last 50 cycles with:
- Date and time
- Engine state badge
- Portfolio value
- Cycle-on-cycle return % (green = positive, red = negative)

---

## API
GET /api/history?limit=30
Returns array of cycle objects:
```json
[
  {
    "timestamp": "2026-03-27T21:16:00Z",
    "btc_price": 66077.7,
    "fear_greed": 13,
    "btc_dominance": 55.9,
    "current_state": "DORMANT",
    "portfolio_value": 813.54
  }
]
Navigation
← Dashboard button returns to localhost:3000
Dashboard has a Portfolio History widget with "View full →" link
Giblets Creations · v2.4.0 · March 2026
