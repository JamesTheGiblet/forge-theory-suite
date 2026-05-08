# DXY Shared Macro Layer
### Cross-Engine Dollar Strength Modifier

**Classification:** Internal · Proprietary  
**Type:** Shared macro modifier (not a trading engine)  
**Cycle:** Daily  
**Status:** 🔵 Documented — pending build

---

## What Is the DXY Layer?

The DXY layer is not a trading engine. It is a shared macro modifier
that sits above all S.E and T.E engines and adjusts their signal
confidence based on US Dollar strength regime.

Strong DXY = risk-off globally. Weak DXY = risk-on globally.

This maps directly onto the Fear & Greed index already running in
S.E Crypto. Together, DXY and F&G give two orthogonal macro risk
dimensions — traditional macro (DXY) and crypto-native sentiment (F&G).

**DXY is a modifier, not a trigger.** It does not generate trades.
It adjusts the confidence weighting of signals from individual engines.
Think of it as the volume knob on each engine's output.

---

## DXY Composition

| Currency | Weight |
|----------|--------|
| Euro (EUR) | 57.6% |
| Japanese Yen (JPY) | 13.6% |
| British Pound (GBP) | 11.9% |
| Canadian Dollar (CAD) | 9.1% |
| Swedish Krona (SEK) | 4.2% |
| Swiss Franc (CHF) | 3.6% |

EUR dominates at 57.6% — DXY is essentially a EUR/USD proxy. But
its value to CCE is as a real-time macro risk barometer that
correlates with regime shifts across almost every asset class
simultaneously.

---

## DXY Regime Definitions

```
STRONG    DXY > 100   Risk-off globally, dollar safe-haven demand
NEUTRAL   DXY 95–100  Normal operating band, no modifier applied
WEAK      DXY < 95    Risk-on globally, dollar losing ground
```

---

## Current State — March 2026

- **Level:** ~99.6 (testing 100 psychological level)
- **52-week range:** 95.55 – 104.68
- **YTD move:** Fell from 109 in Jan 2025 to 96 by mid-Feb 2026,
  then surged 5%+ on Iran conflict
- **Key resistance:** 101.9–102
- **Key support:** 96–97

**Two-phase 2026 outlook:**
- **March–May:** Genuine dollar support. Iran conflict unresolved,
  Fed on hold until Sept minimum, oil elevated.
- **June onwards:** If conflict de-escalates, safe-haven flows fade.
  Most forecasts have DXY at low-to-mid 90s by year-end.

**Current interpretation:** The DXY spike is a temporary geopolitical
premium, not structural dollar strengthening. The underlying trend
remains net dollar weakness through 2026. Once the Iran premium
fades, DXY returns toward 95–97 and the NEUTRAL modifier resumes.

---

## How DXY Modifies Each Engine

| Engine | DXY STRONG >100 | DXY NEUTRAL 95–100 | DXY WEAK <95 |
|--------|----------------|-------------------|--------------|
| S.E Crypto | Reinforces DORMANT — BTC struggles in strong dollar | Own signals | More permissive — BTC gets risk-on tailwind |
| S.E EGP | Amplifies FADE — EGP pressure intensifies | Own signals | Strengthens ACCUMULATE — EGP benefits |
| S.E Forex EUR/USD | Suppresses EUR longs | Own signals | EUR longs amplified |
| S.E Commodities | Blocks entry — already implemented | Own signals | Reduces blocking threshold |
| T.E Momentum | Reduces long confidence | Own signals | Increases long confidence |
| T.E Breakout | Raises breakout confirmation bar | Own signals | Standard confirmation |

---

## Modifier Values

```
STRONG regime  → modifier: -1  (reduce long-risk confidence)
NEUTRAL regime → modifier:  0  (no adjustment)
WEAK regime    → modifier: +1  (increase long-risk confidence)
```

Each engine reads `dxy_state.json` at runtime and adjusts its own
composite score threshold by the modifier before determining state.

---

## Output File

**Location:** `~/cce/signals/dxy_state.json`

```json
{
  "level": 99.6,
  "regime": "NEUTRAL",
  "trend_5d": "RISING",
  "modifier": 0,
  "last_updated": "2026-03-18",
  "notes": "Testing 100 resistance. Iran conflict premium. Watch Fed dot-plot."
}
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│           SHARED MACRO LAYER            │
│  DXY State  ←→  Fear & Greed Index     │
│  dxy_state.json    fg_state.json        │
└──────────────┬──────────────────────────┘
               │ modifier applied to all engines
    ┌──────────┼────────────────────────┐
    ▼          ▼                        ▼
S.E Crypto  S.E EGP            S.E Forex EUR/USD
S.E Stocks  S.E Commodities    T.E Momentum
T.E Grid    T.E Breakout       O.E Observer
    │          │                        │
    └──────────┴────────────────────────┘
               │
        Telegram Alerts
        PM2 Process Management
        Forge HQ Dashboard
```

**Update cadence:** Daily. DXY available free via Yahoo Finance
(`DX=F`) — already fetched by S.E Commodities. Reuse the same
data feed, write to shared state file.

---

## Implementation Notes

- S.E Commodities already fetches DXY daily via `DX=F`
- The shared layer simply writes a state file from that existing feed
- No new API calls required
- All engines read the file at their own cycle start
- Observer records DXY regime in every observation snapshot
- Strategist incorporates DXY regime into allocation recommendations

---

## Key Events Affecting DXY

| Date | Event | DXY Impact |
|------|-------|-----------|
| 18 Mar 2026 | Fed rate decision + dot-plot | Defines April–May trajectory |
| Apr 2026 | Q1 US earnings season | Risk sentiment signal |
| May 2026 | US CPI trend | Fed cut expectations |
| Sept 2026 | Fed expected to resume cutting | Structural DXY weakness resumes |

---

*Giblets Creations · Internal Documentation · Not for distribution*
