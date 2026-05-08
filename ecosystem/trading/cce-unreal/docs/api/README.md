# API Reference

All endpoints are served by the dashboard process on port 3000.

Base URL: `http://localhost:3000/api`

---

## Health

### `GET /api/health`

Platform health check.

**Response:**
```json
{
  "status": "online",
  "timestamp": "2026-03-25T21:00:00.000Z"
}
```

---

## Registry

### `GET /api/registry/overview`

Returns all dynamic engines (from `engines/` folder) and layer status in one call. Designed for Forge HQ dashboard refresh.

**Response:**
```json
{
  "timestamp": "2026-03-25T21:00:00.000Z",
  "engines": {
    "se-forex": {
      "id": "se-forex",
      "name": "Se Forex",
      "type": "STRATEGIC",
      "ecosystem": "S.E",
      "cycle": "4H",
      "dryRun": true,
      "state": "RUNNING"
    }
  },
  "engineCount": 1,
  "layers": {},
  "layerCount": 0,
  "recommendations": []
}
```

---

### `GET /api/registry/engines`

Returns status of all dynamically registered engines.

**Response:**
```json
{
  "engines": { "se-forex": { ... } },
  "count": 1,
  "timestamp": "2026-03-25T21:00:00.000Z"
}
```

---

### `GET /api/registry/engines/:id`

Returns status of a single dynamic engine.

**Parameters:** `id` — engine id (e.g. `se-forex`)

**Response:** Full `getStatus()` output from the engine instance.

**Errors:**
- `404` — engine not found in registry

---

### `GET /api/registry/engines/:id/state`

Returns just the current FSM state string. Lightweight for polling.

**Response:**
```json
{
  "id": "se-forex",
  "state": "DORMANT"
}
```

---

### `GET /api/registry/layers`

Returns status of all dynamically registered AI layers.

**Response:**
```json
{
  "layers": {},
  "count": 0,
  "timestamp": "2026-03-25T21:00:00.000Z"
}
```

---

### `GET /api/registry/layers/:id`

Returns status of a single AI layer.

---

### `GET /api/registry/recommendations`

Returns aggregated recommendations from all ANALYST-pattern AI layers. This is the G.O's input feed.

**Response:**
```json
{
  "recommendations": [],
  "count": 0,
  "timestamp": "2026-03-25T21:00:00.000Z"
}
```

---

## Engine-Specific Endpoints

These endpoints read directly from each engine's storage database.

### `GET /api/status`
S.E Crypto current cycle status.

### `GET /api/history`
S.E Crypto cycle history.

### `GET /api/transitions`
S.E Crypto state transitions.

### `GET /api/trades`
S.E Crypto trade history.

### `GET /api/forex/status`
S.E Forex EUR/USD status.

### `GET /api/rme/status`
S.E RME (REIT) status.

### `GET /api/cme/status`
S.E CME (Stocks) status.

### `GET /api/como/status`
S.E COMO (Commodities) status.

### `GET /api/egp/status`
S.E EGP (USD/EGP) status.

### `GET /api/grid/status`
T.E Grid BTC status.

### `GET /api/mom/status`
T.E Momentum status.

### `GET /api/brk/status`
T.E Breakout status.

### `GET /api/lce/status`
T.E LCE Liquidation status.

### `GET /api/obs/status`
O.E Observer status + observation count.

### `GET /api/obs/observations`
O.E Observer recent observations.

### `GET /api/obs/patterns`
O.E Observer pattern analysis results.

### `GET /api/sentinel/status`
O.E Sentinel anomaly summary.

### `GET /api/dxy/status`
DXY Layer status (feeds S.E Forex).

---

## Builder

### `POST /api/builder/forge`

Receives a builder spec from the Visual Engine Builder and generates engine files.

**Request body:**
```json
{
  "engine_id": "my-engine",
  "engine_type": "STRATEGIC",
  "cycle": "4H",
  "states": [
    {
      "id": "DORMANT",
      "type": "riskoff",
      "entry": "fg() < 25",
      "exit": "fg() >= 30",
      "allocations": [{ "asset": "CASH", "weight": 1.0 }]
    }
  ],
  "transitions": [
    { "from": "DORMANT", "to": "WATCHING" }
  ]
}
```

**Response (success):**
```json
{
  "success": true,
  "engine_id": "my-engine",
  "message": "Engine generated successfully"
}
```

**Response (offline — no server connection):**
The builder falls back to displaying the raw spec JSON in the forge modal for manual file creation.

---

## Streaming

### `GET /api/stream`

Server-Sent Events stream for real-time dashboard updates. Connect once and receive push events on every engine cycle.

**Usage:**
```javascript
const es = new EventSource('/api/stream');
es.onmessage = e => {
  const data = JSON.parse(e.data);
  // data.type: 'cycle' | 'transition' | 'alert'
};
```

---

## Reports

### `GET /api/report/generate`
Generates a full platform performance report.

### `GET /api/report/download/:stamp/:type`
Downloads a generated report by timestamp and type (json/html).

---

## Platform Routes

These serve the frontend pages:

| Route | File |
|-------|------|
| `GET /forge/builder` | `public/forge/builder.html` |
| `GET /forge/replay` | `public/forge/replay.html` |
| `GET /marketplace` | `public/marketplace/index.html` |
| `GET /forge` | `public/forge-hq.html` |

---

## Error Format

All errors return JSON:

```json
{
  "error": "Engine not found: my-engine",
  "status": 404
}
```

Common status codes:
- `200` — success
- `404` — engine or resource not found
- `500` — internal error (check `~/.pm2/logs/dashboard-error.log`)
- `503` — registry not initialised (PM2 still starting)
