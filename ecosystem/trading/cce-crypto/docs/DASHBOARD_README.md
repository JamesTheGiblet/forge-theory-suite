# CCE Dashboard Guide (v2.4.0)

**URL:** `http://localhost:3000`
**History:** `http://localhost:3000/history`
**CCE Unreal:** `http://localhost:3001`
**Engine Builder:** `http://localhost:3001/forge/builder`
**Backtest Replay:** `http://localhost:3001/forge/replay`
**Marketplace:** `http://localhost:3001/marketplace`
**Documentation:** `http://localhost:3001/docs`

The dashboard is your mission control. This guide describes the new interface with a centered portfolio, live rings, and interactive engine tabs.

---

## Command Dashboard (`/`)

### Header & Logo

- Centered CCE logo with crown‑engine icon.
- Version badge (v2.4.0).

### Four Live Rings

| Ring | Source | Indicator |
|------|--------|-----------|
| BTC / ATH | Kraken / bot | Live price, % of all‑time high |
| VIX FEAR | CME database | Live CCE Volatility Index |
| BTC DOM | CoinGecko / bot | Live dominance percentage |
| F&G INDEX | alternative.me | Live Fear & Greed, dynamic label |

Each ring is a circular progress bar that updates every 30 seconds.

---

### Portfolio Center (clickable)

- Shows your **real Kraken portfolio value** (USDC + other assets).
- Displays top three assets as bubbles.
- **Status badges** summarise active engines:  
  - ❤️ *X active* (engines in ACTIVE / SCANNING)  
  - 🟢 *Y watching* (engines in WATCHING)  
  - ⚠️ *Z caution* (engines in CAUTION)  
- Tap the center to open a modal with full asset breakdown and pie chart.

---

### Engine Tabs

Three tabs group the 13 engines:

- **S.E** – Strategic Engines (6): CRY, FX, REIT, STK, COM, EGP
- **T.E** – Tactical Engines (4): GRID, MOM, BRK, LCE
- **O.E** – Observer Engines (3): OBS, SEN, STR

Each engine row shows:
- Code, state (coloured badge), preview (KEY 1), and a **state icon**:
  - ❤️ *beating heart* – ACTIVE / SCANNING
  - 🟢 *pulsing green circle* – WATCHING
  - ⚠️ *yellow triangle* – CAUTION
  - 💤 *zzz* – DORMANT
  - 🔥 *small flame* – engine with live data (e.g., CRY, COM)
- Tap any row to open a modal with full KEY 1‑3, active anomaly, and extra notes.

---

### Download & Telegram Buttons

- **📥 Download Data** – exports current dashboard snapshot as CSV.
- **📜 Download History** – exports historical CCE cycles from your database.
- **📱 Test Telegram** – sends a test message to your configured Telegram bot.

---

### Footer

- Live timestamp, active sensor count (SEN), and connection status.

---

## API Endpoints (Added/Updated)

| Endpoint | Description |
|----------|-------------|
| `/api/portfolio` | Real Kraken portfolio (assets, total USD) |
| `/api/como/status` | Live gold price (via MetalpriceAPI), static oil |
| `/api/vix` | Static VIX (26.9) |
| `/api/export/csv` | Current snapshot (CSV) |
| `/api/export/history` | Historical cycles (CSV) |
| `/api/telegram/send` | Send custom message to Telegram |
| `/api/telegram/test` | Send test message |

All previous endpoints (`/api/status`, `/api/grid/status`, etc.) remain unchanged.

---

## Forge HQ (`/forge`)

PWA‑installable card layout – same data, different visual style.

---

## Emergency Stop

`POST /api/emergency-stop` – kills the `cce-bot` PM2 process.  
Protected by `DASHBOARD_STOP_TOKEN` if set in `.env`.

---

*Giblets Creations · Internal Documentation · v2.3*  
*"I wanted it. So I forged it. Now forge yours."*
---

## New Widgets (v2.4.0)

### G.O Regime Widget
- Shows current market regime (RISK_ON / RISK_OFF)
- Stability percentage with progress bar
- G.O status (LEARNING / OBSERVING / ADVISORY)

### Portfolio History Widget
- Tap "View full →" to open the full history page
- Shows starting value, total return %, cycle count
- Full history page: range selector (7D/30D/90D/6M/1Y/ALL), BTC overlay toggle

### Agricultural Weather Signals
- 6 commodity cards: Corn, Soybeans, Wheat, Oranges, Rice
- Bullish (▲ green) / Neutral (◆ amber) / Bearish (▼ red)
- Location, temperature, condition, reason
- Updates every 60 minutes

### System Health (AUDIT)
- Shows ● All Good or active alert count
- Last check timestamp

### Guidance Layer
- Risk slider: CAUTIOUS / BALANCED / AGGRESSIVE
- Affects doubt thresholds and future allocation layers

### Recent Siphons (CSS)
- Lists last 3 profit siphon events
- Engine → fund, amount, timestamp

### History Page (`/history`)
- Full portfolio chart with range selector
- BTC price overlay toggle
- Recent cycles list with cycle-on-cycle returns

---

*Giblets Creations · v2.4.0 · March 2026*
