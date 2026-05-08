# CCE Tier System
### Client Platform Tiers — Engine Access & Pricing

**Status:** 🟢 Live
**Controlled by:** `CCE_CLIENT_TIER` in `.env`
**Dashboard:** Platform badge with lock on client instances

---

## Overview

The CCE platform is tiered by exchange access. Clients start on Starter (Kraken only) and upgrade as their capital grows and confidence builds. Each tier unlocks additional engines and exchanges.

---

## Tiers

### 🟠 Starter — Kraken only
**Setup fee:** £200 | **Siphon:** 10-15% tiered

**S.E Engines:**
- S.E Crypto (BTC/USDC) — LIVE
- S.E Fear Fade (BTC/USDC)
- S.E GoldForge (XAUT/USDT)
- S.E Alt Season (ETH/USDC, SOL/USDC)
- S.E Underdog (ALGO/DOT/ATOM/VET)

**T.E Engines:**
- T.E Grid (BTC/USDC)
- T.E Momentum (BTC/ETH/SOL)
- T.E Breakout (BTC/ETH/SOL)

**O.E Engines:**
- O.E Observer
- O.E Sentinel
- O.E Strategist

**Total: 11 engines on Kraken**

---

### 🟡 Advanced — Kraken + Binance Futures
**Setup fee:** £300 | **Siphon:** 10-15% tiered

Everything in Starter, plus:
- T.E LCE (Liquidation Cascade — BTC/ETH/SOL futures)

**Requires:** Binance account with futures enabled
**Total: 12 engines**

---

### 🟢 Full Platform — All exchanges
**Setup fee:** £500 | **Siphon:** 10-15% tiered

Everything in Advanced, plus:
- S.E Forex (EUR/USD — broker)
- S.E REIT (O Realty — broker)
- S.E Stocks (SPY — broker)
- S.E Commodities (Oil/Gold — broker)
- S.E EGP (USD/EGP — manual)

**Requires:** IG, Trading212, or IBKR account
**Total: 17 engines**

---

## Siphon Rate (all tiers)

| Return | Siphon Rate | Client Keeps |
|--------|-------------|--------------|
| 0-50% | 10% | 90% |
| 50-100% | 12% | 88% |
| 100%+ | 15% | 85% |

Siphon is automatic via CSS engine. No manual invoicing.
No siphon on losing trades or during DORMANT periods.

---

## Implementation

### Environment Variable
```bash
# In client .env on VPS
CCE_CLIENT_TIER=starter   # or advanced or full
Engine Gating (index.js)
const clientTier = process.env.CCE_CLIENT_TIER || 'full';

if (clientTier === 'starter' || clientTier === 'advanced') {
  config.forex.enabled  = false;
  config.rme.enabled    = false;
  config.cme.enabled    = false;
  config.como.enabled   = false;
  config.egp.enabled    = false;
}

if (clientTier === 'starter') {
  config.lce.enabled = false;
}
Dashboard Lock
Badge shows tier name and 🔒 icon
Tap badge → popup explaining lock
Dropdown disabled — cannot change tier
Tier persists on page refresh
Onboarding Flow
Client pays setup fee
    ↓
Deploy VPS instance
    ↓
Set CCE_CLIENT_TIER=starter in .env
    ↓
Only Starter engines start
    ↓
Dashboard locked to Starter view
    ↓
Client upgrades → update .env → restart
Upgrade Path
When client wants to upgrade:
# SSH into VPS
ssh cce-vps

# Update tier
nano /home/cce/clients/<name>/.env
# Change: CCE_CLIENT_TIER=starter → advanced

# Restart
pm2 restart <name>-cce --update-env

# Collect additional setup fee difference
Current Clients (March 2026)
Client
Tier
Since
James (Personal)
Full
13 March 2026
Abe
Starter (pending)
—
Mark
Starter (pending)
—
Giblets Creations · v1.0 · March 2026
"I wanted it. So I forged it. Now forge yours."
