# API Reference
### CCE Dashboard — All Endpoints

**Base URL:** `http://localhost:3000`
**Format:** All responses are JSON unless noted
**Auth:** None (local only)

---

## Platform

### Health Check
GET /api/health
```json
{ "status": "online", "timestamp": "2026-03-30T..." }
BTC Ticker (proxy for CCE Unreal)
GET /api/ticker
{ "btc_price": 66077.7, "fear_greed": 13, "btc_dominance": 55.9, "timestamp": "..." }
S.E Crypto
Latest Cycle Status
GET /api/status
{
  "btc_price": 66077.7,
  "fear_greed": 13,
  "btc_dominance": 55.9,
  "current_state": "DORMANT",
  "portfolio_value": 813.54,
  "timestamp": "2026-03-27T21:16:51.066Z"
}
Cycle History
GET /api/history?limit=30
Returns array of cycle objects (newest first):
[
  {
    "timestamp": "...",
    "btc_price": 66077.7,
    "fear_greed": 13,
    "btc_dominance": 55.9,
    "current_state": "DORMANT",
    "portfolio_value": 813.54
  }
]
State Transitions
GET /api/transitions
Returns last 50 state transitions:
[{ "from_state": "WATCHING", "to_state": "DORMANT", "reason": "...", "timestamp": "..." }]
T.E Engines
Grid Status
GET /api/grid/status
{
  "state": "ACTIVE",
  "profit": 0,
  "open_buys": 5,
  "open_sells": 5,
  "cycles": 0,
  "btc_price": 66427.52,
  "centre_price": 66526.07,
  "portfolio_value": 125
}
LCE Status
GET /api/lce/status
{ "state": "DORMANT", "daily_pnl": 0, "cycle": 12 }
Momentum Status
GET /api/momentum/status
{ "state": "STANDBY", "capital": 125 }
Breakout Status
GET /api/breakout/status
{ "state": "SCANNING", "capital": 100 }
O.E Engines
Observer Status
GET /api/observer/status
{
  "observations": 403,
  "patterns": 9,
  "anomalies": 0,
  "count": 403
}
Strategist Status
GET /api/strategist/status
{
  "current": 403,
  "threshold": 165,
  "percent": 100,
  "ready": true
}
Sentinel Status
GET /api/sentinel/status
{ "active_anomalies": 3, "warn_count": 2, "alert_count": 1 }
Sentinel Active Alerts
GET /api/sentinel/active
{ "count": 3, "alerts": [...] }
S.E Market Data
Commodities (COMO)
GET /api/como/status
{ "oil_price": 99.64, "gold_price": 4493.87, "timestamp": "..." }
Stocks (CME)
GET /api/cme/status
{ "spy_price": 634.09, "vix": 26.9, "state": "WATCHING" }
REIT Status
GET /api/rme/status
{ "state": "DORMANT", "fed_rate": 3.64, "treasury_yield": 4.42, "price": 60.69 }
REIT Price
GET /api/reit/price
{ "price": 60.69, "timestamp": "..." }
FRED Economic Data
GET /api/fred/status
{ "fed_rate": 3.64, "treasury_10y": 4.42, "timestamp": "..." }
DXY (Dollar Index)
GET /api/dxy/status
{ "dxy": 100.15, "timestamp": "..." }
Forex Rate
GET /api/forex/rate
{ "eur_usd": 1.15, "timestamp": "..." }
CCE Volatility Index
GET /api/cce/volatility
{ "vix": 3.11, "source": "cce", "timestamp": "..." }
Portfolio
Live Portfolio Balance
GET /api/portfolio
{
  "totalUSD": 813.54,
  "assets": [
    {
      "symbol": "USDC",
      "amount": 813.54,
      "usdValue": 813.54,
      "price": 1,
      "percentage": 100
    }
  ],
  "timestamp": "..."
}
Intelligence Layers
G.O Status
GET /api/go/status
{ "regime": "RISK_OFF", "stability": 0.5, "status": "LEARNING" }
F.L Doubt Patterns
GET /api/fl/doubt
{
  "patterns": [
    { "engine": "mom", "doubt_score": 0.67, "pattern": "fg:0-20|vix:low" }
  ]
}
F.L Lessons
GET /api/fl/lessons
{ "lessons": [...] }
CSS Siphon Events
GET /api/css/events?limit=10
{
  "events": [
    { "from_engine": "grid", "to_fund": "BTC", "amount_usd": 2.50, "timestamp": "..." }
  ]
}
AUDIT Summary
GET /api/audit/summary
{
  "active_alerts": 0,
  "alerts": [],
  "timestamp": "..."
}
Weather Signals
GET /api/weather/signals
{
  "signals": [
    {
      "commodity": "Soybeans",
      "signal": 0.3,
      "reason": "Good rainfall",
      "location": "US Midwest",
      "temp": 6.1,
      "condition": "Clouds",
      "humidity": 70
    }
  ]
}
Guidance Layer
Get Current Guidance
GET /api/guidance/current
{ "mode": "BALANCED", "signal": 0.5, "updated": "..." }
Set Guidance
POST /api/guidance/set
Content-Type: application/json

{ "mode": "CAUTIOUS" }
// or
{ "signal": 0.25 }
{ "success": true, "mode": "CAUTIOUS", "signal": 0 }
Telegram
Send Message
POST /api/telegram/send
Content-Type: application/json

{ "message": "🔔 Test from CCE" }
{ "success": true }
Export
Export CSV
GET /api/export/csv
Returns CSV file download of all cce_cycles data.
Export History CSV
GET /api/export/history?limit=100
Returns CSV of last N cycles with timestamp, btc_price, fear_greed, btc_dominance, portfolio_value, current_state.
Registry (CCE Framework)
Registry Overview
GET /api/registry/overview
{
  "timestamp": "...",
  "engines": {},
  "engineCount": 0,
  "layers": {},
  "layerCount": 0
}
Registry Engines
GET /api/registry/engines
Returns all manifests from engines/ folder.
Pages
Route
Returns
GET /
Main dashboard (index.html)
GET /history
Portfolio history page
GET /forge/builder
Visual engine builder
GET /forge/replay
Backtest replay
GET /marketplace
Engine marketplace
GET /docs
Documentation reader
GET /docs/files/*
Serve docs markdown files
Error Responses
All endpoints return errors as JSON:
{ "error": "error message" }
Failed database reads return the fallback value defined in queryDb().
Giblets Creations · v2.4.0 · March 2026
