# CCE Control
### Client Management Dashboard — Port 3002

**Status:** 🟢 Live
**Source:** `cce-control-server.js`
**Dashboard:** `public/control/index.html`
**Data:** `data/cce-clients.json`
**PM2:** `cce-control`

---

## Overview

CCE Control is the master client management dashboard. It sits above all deployed CCE instances and provides a single view of every client account — their live balance, return, engine state, setup fee status, and siphon earnings.

---

## Revenue Model

| Fee | Amount | When |
|-----|--------|------|
| Setup fee | £200 | One-time, before setup begins |
| Siphon | 10% of profits | Automatic, on every profitable trade |

---

## Adding a Client

1. Open `localhost:3002`
2. Tap **+ Add Client**
3. Fill in name, starting capital, setup fee
4. Add their Kraken read-only API key (optional — for live balance)
5. Tick "setup fee already paid" if payment received
6. Tap **Add Client**

They appear immediately in the dashboard with live balance monitoring.

---

## Client Data Structure

Stored in `data/cce-clients.json`:

```json
{
  "id": "1234567890",
  "name": "Abe",
  "startingCapital": 1000,
  "krakenReadKey": "their_read_only_key",
  "krakenReadSecret": "their_read_only_secret",
  "setupFeePaid": true,
  "setupFeeAmount": 200,
  "siphonTotal": 0,
  "engineState": "DORMANT",
  "joinDate": "2026-03-30T00:00:00.000Z",
  "notes": "Word of mouth, friend of James"
}
Balance Monitoring
Personal account (James):
Reads live balance from CCE dashboard API (localhost:3000/api/portfolio) — avoids Kraken nonce conflicts with the trading engine.
Client accounts:
Uses the client's Kraken read-only API key via CCXT. Read-only key requires Query Funds permission only — no withdrawal possible.
No API key provided:
Shows starting capital as current value until a key is added.
API Endpoints
GET  /api/control/clients      — All clients with live balances + totals
POST /api/control/clients      — Add a new client
PUT  /api/control/clients/:id  — Update a client
DELETE /api/control/clients/:id — Remove a client
GET  /api/control/revenue      — Revenue summary
GET  /api/control/health       — Health check
PM2
pm2 start cce-control-server.js --name cce-control
pm2 restart cce-control
pm2 logs cce-control --lines 10
Auto-starts on device boot via pm2 save + pm2 startup.
Personal Account Auto-Seed
On startup, CCE Control automatically creates the personal account entry using KRAKEN_READ_KEY and KRAKEN_READ_SECRET from .env. If these aren't set it falls back to KRAKEN_API_KEY and KRAKEN_API_SECRET.
The personal account:
ID: personal
Setup fee: £0
Starting capital: £375
Join date: 13 March 2026
Onboarding a New Client
Client creates Kraken account
Client generates API key — Query Funds only, no withdrawal
Client sends you the key and secret (WhatsApp etc)
You add them in CCE Control
Get service agreement signed (see docs/CONTRIBUTING.md for agreement template)
Collect £200 setup fee
Tick "setup fee paid" in CCE Control
Current Clients (30 March 2026)
Client
Capital
Status
James (Personal)
£375
Live — £813.54 (+116.9%)
Abe
£1,000
Pending setup
Mark
TBC
Pending setup
Planned Features
QR code onboarding (when 5+ clients)
Per-client Telegram feed
Automated siphon tracking from CSS engine
Monthly report generation per client
Multi-instance CCE deployment support
Giblets Creations · v1.0 · March 2026
"I wanted it. So I forged it. Now forge yours."
