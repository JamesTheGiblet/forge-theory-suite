# S.E Kraken Engines
### Strategic Engine Suite — Kraken Exchange
**Status:** 🟢 Running | **Mode:** DRY RUN | **Tier:** Starter

---

## Overview

Four Strategic Engines running on Kraken, complementing S.E Crypto. Each targets a different market condition — together they cover the full crypto market cycle from extreme fear through to alt season rotation.

---

## Engine Map
F&G 0-20   — Extreme Fear   → SE-FF Fear Fade + SE-GF GoldForge ACTIVE
F&G 20-35  — Fear           → SE-UD Underdog WATCHING
F&G 35-60  — Neutral        → All DORMANT — S.E Crypto takes over
F&G 60-80  — Greed          → SE-ALT Alt Season WATCHING (if dom falling)
F&G 80-100 — Extreme Greed  → All exit, S.E Crypto CASCADE
---

## S.E Fear Fade (SE-FF)

**File:** `engines/se-fear-fade/`
**Asset:** BTC/USDC
**Capital:** $100 USDC
**Cycle:** 4H

### Strategy
Counter-cyclical sentiment engine. Buys BTC during Extreme Fear and holds until Greed returns. Directly complementary to S.E Crypto — active when S.E Crypto is most cautious.

### States
DORMANT → WATCHING (F&G ≤ 30)
WATCHING → ACTIVE  (F&G ≤ 20 — Extreme Fear confirmed)
ACTIVE → HOLDING   (position opened)
HOLDING → EXITING  (F&G ≥ 60 OR stop loss OR take profit)
EXITING → DORMANT  (position closed)
### Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| Entry F&G | ≤ 20 | Extreme Fear threshold |
| Watch F&G | ≤ 30 | Start monitoring |
| Exit F&G | ≥ 60 | Greed returning |
| Stop Loss | -15% | Maximum drawdown |
| Take Profit | +40% | Target return |

### Signal Logic
- Primary: Fear & Greed Index from alternative.me
- Secondary: BTC price from Kraken public API
- No exchange account needed for data — public endpoints only

---

## S.E GoldForge (SE-GF)

**File:** `engines/se-goldforge/`
**Asset:** XAUT/USDT (Tether Gold)
**Capital:** $100 USDC
**Cycle:** 4H

### Strategy
Trades Tether Gold token on Kraken. Enters when crypto fear spikes (gold historically rises during crypto crashes). Exits when crypto sentiment recovers. Bridges GoldForge concept (physical gold accumulation) with live automated trading.

### States
DORMANT → WATCHING (F&G ≤ 35)
WATCHING → ACTIVE  (F&G ≤ 25 + gold momentum > 0.5%)
ACTIVE → HOLDING   (XAUT position opened)
HOLDING → EXITING  (F&G ≥ 55 OR stop loss OR take profit)
EXITING → DORMANT  (position closed)
### Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| Entry F&G | ≤ 25 | Fear threshold |
| Watch F&G | ≤ 35 | Start monitoring |
| Exit F&G | ≥ 55 | Crypto recovering |
| Gold Momentum | > 0.5% | Gold must be rising to confirm |
| Stop Loss | -8% | Tight — gold is less volatile |
| Take Profit | +20% | Conservative gold target |

### Signal Logic
- Primary: Fear & Greed Index
- Secondary: XAUT/USDT price from Kraken
- Gold momentum calculated over rolling 5-cycle window
- Inverse correlation to crypto sentiment is the core thesis

---

## S.E Alt Season (SE-ALT)

**File:** `engines/se-alt-season/`
**Assets:** ETH/USDC (primary), SOL/USDC (fallback)
**Capital:** $100 USDC
**Cycle:** 4H

### Strategy
Monitors BTC dominance. When dominance falls below 50% it signals capital rotating from BTC into altcoins. Rotates into ETH first (most liquid), SOL as fallback. Exits when dominance recovers above 55%.

### States
DORMANT → WATCHING  (BTC dom < 52% AND falling)
WATCHING → ROTATING (BTC dom < 50%)
ROTATING → HOLDING  (ETH/SOL position opened)
HOLDING → EXITING   (BTC dom > 55% OR stop loss OR take profit)
EXITING → DORMANT   (position closed)
### Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| Entry Dom | < 50% | Rotate when BTC dom falls below 50% |
| Watch Dom | < 52% | Start monitoring |
| Exit Dom | > 55% | BTC dominance recovering |
| Stop Loss | -20% | Alt coins are volatile |
| Take Profit | +50% | Alt season target |

### Signal Logic
- BTC dominance from CoinGecko global endpoint
- ETH + SOL prices from Kraken public API
- Dominance trend calculated over rolling 5-cycle window
- Requires falling trend (> 1% drop over 5 cycles) to confirm

---

## S.E Underdog (SE-UD)

**File:** `engines/se-underdog/`
**Assets:** ALGO, DOT, ATOM, VET (equal weight basket)
**Capital:** $200 USDC ($50 per asset)
**Cycle:** 4H

### Strategy
Quality beaten-down altcoin basket. Buys four fundamentally sound projects at historic lows during extreme fear. Holds for the alt season rotation when capital floods back into quality mid-caps. Exits when greed returns or BTC dominance spikes.

### The Basket
| Asset | Project | Why |
|-------|---------|-----|
| ALGO | Algorand | Fast L1, carbon neutral, dead in sentiment |
| DOT | Polkadot | Parachain ecosystem, heavily discounted |
| ATOM | Cosmos | IBC network growing, price lagging fundamentals |
| VET | VeChain | Enterprise supply chain, real adoption, forgotten |

### States
DORMANT → WATCHING (F&G ≤ 35 + BTC dom < 54%)
WATCHING → LOADING (F&G ≤ 20 — Extreme Fear confirmed)
LOADING → HOLDING  (basket purchased — all 4 positions opened)
HOLDING → EXITING  (F&G ≥ 60 OR BTC dom > 58% OR stop loss OR take profit)
EXITING → DORMANT  (all positions closed, PnL logged per asset)
### Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| Entry F&G | ≤ 20 | Extreme Fear only |
| Watch F&G | ≤ 35 | Start monitoring |
| Exit F&G | ≥ 60 | Greed returning |
| Entry Dom | < 54% | BTC must not be too dominant |
| Exit Dom | > 58% | Exit if BTC dom surges |
| Stop Loss | -25% | Alts can drop hard |
| Take Profit | +60% | Quality alts target in rotation |

### Signal Logic
- Fear & Greed from alternative.me
- BTC dominance from CoinGecko
- Asset prices from Kraken public API (ALGO/DOT/ATOM/VET vs USDC)
- Basket PnL calculated as equal-weighted average across all 4 positions

---

## Integration

All four engines are connected to:

| System | Status |
|--------|--------|
| Engine Registry | ✅ Auto-loaded from `/engines/` |
| O.E Observer | ✅ State captured every 15 min |
| O.E Sentinel | ✅ Monitored for anomalies |
| O.E Strategist | ✅ Via Observer snapshots |
| F.L Forensic | ✅ Trade history analysed Monday |
| G.O Orchestrator | ✅ Capital scored and adjusted |
| CCE Dashboard | ✅ Starter tier visible |
| CCE Control | ✅ Client monitoring |
| Telegram | ✅ Trade notifications |

---

## Current Status (31 March 2026)

| Engine | State | Notes |
|--------|-------|-------|
| SE-FF Fear Fade | WATCHING | F&G 11 — building toward entry |
| SE-GF GoldForge | WATCHING | F&G 11 — watching gold momentum |
| SE-ALT Alt Season | DORMANT | BTC dom 56% — above entry threshold |
| SE-UD Underdog | DORMANT | BTC dom 56% — above 54% threshold |

All engines in DRY RUN — no real capital deployed on new engines yet.
S.E Crypto is the only live engine on real capital ($521.83).

---

## Going Live Checklist

Before switching any engine to `dryRun: false`:

- [ ] Minimum 30 dry run cycles completed
- [ ] At least 1 complete trade cycle (entry + exit) in dry run
- [ ] F.L Forensic has analysed trade history
- [ ] G.O Orchestrator has scored the engine
- [ ] Capital allocation confirmed in config.js
- [ ] Kraken account has sufficient USDC balance
- [ ] Telegram notifications tested and working

---

*Giblets Creations · v1.0 · March 2026*
*"I wanted it. So I forged it. Now forge yours."*
