# FlipSignal
### eBay Reseller Price Signal Tool

**Status:** 🔵 Design — first commercial product after CCE Handbook
**Concept:** Apply CCE's regime classifier to eBay reseller markets
**Target:** Retro gaming resellers, eBay power sellers, car boot traders

---

## Overview

FlipSignal takes the core insight behind CCE — that markets move through
recognisable regimes with predictable patterns — and applies it to
eBay sold listings.

Just as CCE watches BTC dominance and Fear & Greed to time crypto trades,
FlipSignal watches eBay sold prices, search volume, and seasonal patterns
to tell resellers when to buy, hold, and sell specific product categories.

---

## The Core Insight

eBay reseller markets behave like financial markets:

- **Prices cycle** — retro games spike at Christmas, dip in January
- **Sentiment matters** — YouTube coverage drives demand waves
- **Temporal lags exist** — a viral video causes a price spike 2-3 weeks later
- **Regimes are real** — "hot" categories cool down, "cold" ones warm up

CCE already has all the tools to detect these patterns. FlipSignal is
a new frontend on existing CCE infrastructure.

---

## Starting Category — Retro Gaming

First market: retro gaming (SNES, N64, Mega Drive, Game Boy)

Why:
- James has existing knowledge and 355-star eBay shop
- High search volume, well-documented price history
- Clear seasonal patterns (Christmas spike, post-Christmas dip)
- YouTube coverage creates predictable demand waves
- Low barrier — £20-200 items, not £2,000 items

---

## How It Works

### Data Sources
- **eBay Sold Listings API** — actual sold prices (not asking prices)
- **Google Trends** — search volume for game titles
- **YouTube** — video upload frequency for retro gaming channels
- **Seasonal calendar** — Christmas, Easter, school holidays

### Signal Generation
FlipSignal uses CCE's regime classifier adapted for eBay:
COLD    — prices below 3-month average, low search volume
WARMING — prices rising, search volume increasing
HOT     — prices at peak, high search volume, YouTube coverage
COOLING — prices declining from peak, sell signal
### Output
For each tracked item/category:
🎮 SNES Console
Signal:  BUY ▲
Price:   £45 avg (3m low: £38, 3m high: £67)
Regime:  WARMING
Reason:  Post-Christmas dip ending, search volume recovering
Action:  Buy now, target sell £65+ in 6-8 weeks
---

## Architecture
FlipSignal
├── Data Layer
│   ├── eBay Sold Listings scraper/API
│   ├── Google Trends fetcher
│   └── Seasonal calendar
│
├── Signal Engine (CCE SDK)
│   ├── cce.Signals.Technical — adapted for price history
│   ├── Regime classifier — COLD/WARMING/HOT/COOLING
│   └── Z-score calculator — statistical over/undervalue
│
├── Dashboard
│   ├── Category overview (regime cards)
│   ├── Item drill-down (price history chart)
│   ├── Buy/sell signal feed
│   └── Portfolio tracker (what you own, target sell price)
│
└── Alerts
└── Telegram — buy signals, price alerts, regime changes
---

## CCE SDK Integration

```javascript
const cce = require('../cce-crypto/sdk');
const config = require('../cce-crypto/config');

// Use CCE's Z-score logic for eBay prices
const tech = new cce.Signals.Technical(config.strategy.signals);

// Adapt for eBay sold price history
const ebaySignals = tech.getAllSignals(
  soldPrices,      // array of sold prices (like BTC closes)
  [],              // no dominance equivalent
  currentPrice,    // latest sold price
  hourUTC          // time of day (auction timing matters)
);

// Same regime logic — different asset
const regime = ebaySignals.btcAbove20SMA ? 'WARMING' : 'COLD';
Revenue Model
Product
Price
Model
FlipSignal Basic
Free
Limited categories, delayed signals
FlipSignal Pro
£9.99/mo
All categories, real-time signals
FlipSignal API
£49/mo
Raw signal data for power users
Category packs
£4.99 each
Retro gaming, vinyl, trainers, etc.
Connection to CCE
FlipSignal is not a separate product — it's a new frontend on CCE infrastructure:
Uses CCE SDK for signal generation
Uses CCE's Telegram integration for alerts
Uses CCE's storage pattern (sql.js databases)
Shares the regime classification logic
Validates FlipSignal's commercial model before building GoldForge
Implementation Plan
Phase
Description
Est. Time
Phase 1
eBay sold listings data feed
1 week
Phase 2
Regime classifier adaptation
3 days
Phase 3
Basic dashboard (top 20 items)
1 week
Phase 4
Telegram alerts
2 days
Phase 5
Gumroad listing (Pro tier)
1 day
Phase 6
Expand categories
Ongoing
Why Now
CCE Handbook is live on Gumroad — commercial channel established
eBay shop has 355 stars — existing audience
LinkedIn post going out today — building the audience
FlipSignal is low-risk validation of the commercial model
Retro gaming knowledge means no new domain learning required
Giblets Creations · v2.4.0 · March 2026
"I wanted it. So I forged it. Now forge yours."
