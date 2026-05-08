# S.E EGP
### Regime-Classified State Engine — USD/EGP Managed Float

**Classification:** Internal · Proprietary  
**Asset Class:** Foreign Exchange (USD/EGP)  
**Regime Type:** Policy-driven managed float  
**Cycle:** Weekly (CBE data cadence)  
**Status:** 🔵 Dry Run — Live (CAUTION active)

---

## Why USD/EGP Is Different

Most forex pairs are sentiment-driven — millions of participants reacting
in real time to price action, technicals, and flow data. USD/EGP operates
under a managed float overseen by the Central Bank of Egypt (CBE).

This changes everything. Big regime shifts are:
- Policy-driven, dateable, and structurally foreseeable
- Not noise — they are detectable CBE posture changes
- Low frequency — weekly check is sufficient, not tick data
- Pre-schedulable — CBE meeting dates are published in advance

This makes USD/EGP one of the highest-signal, lowest-noise pairs
available for a regime-based state engine.

---

## The Three Core Regimes

### Regime 1 — CBE Quiet Accumulation
**Conditions:** CBE cutting rates + inflation declining + reserves
rising + EGP strengthening

The CBE is in controlled easing mode. Inflation is heading toward the
7% ±2% Q4 2026 target. Foreign capital flows in chasing real yield on
Egyptian T-bills. The pound appreciates steadily.

**Recent example:** February 2026. CBE cut 100bps to 19%, pound
appreciated ~2% YTD, trading at 46 EGP/USD, reserves at $52.7bn
record high.

**Engine state:** ACCUMULATE — short USD/EGP (buy EGP)

---

### Regime 2 — EGP Devaluation Surge
**Conditions:** Oil price spike + current account pressure + inflation
re-accelerating + EGP weakening sharply

External shock hits Egypt's import bill. FX reserves come under
pressure as the CBE defends the pound. Eventually defence weakens
and EGP slides fast.

**Recent example:** March 2026. Middle East conflict pushed oil above
$85/bbl. Strait of Hormuz disruption threatened shipping. EGP fell
11.38% in a single month, USD/EGP spiking from ~46 to 52+.

**Engine state:** FADE — long USD/EGP (short EGP)

---

### Regime 3 — Policy Divergence (The Danger Zone)
**Conditions:** CBE cutting rates WHILE inflation simultaneously rising

The central bank is prioritising growth or debt servicing over
inflation control. The most unstable regime — precedes either a
disorderly devaluation OR a sharp emergency policy reversal. Both
are tradeable but in opposite directions, making position-holding
dangerous.

**Live example:** 18 March 2026. Egypt annual inflation surged to
13.4% in February (above 12% forecast), yet CBE cut rates again.
Rate cut + inflation spike = Policy Divergence active.

**Engine state:** CAUTION — exit all positions, monitor for resolution

---

## Signal Stack

| Signal | Source | Frequency | Regime Indicator |
|--------|--------|-----------|-----------------|
| CBE Overnight Deposit Rate | cbe.org.eg | ~6 weeks | Rate direction + magnitude |
| Egypt CPI (Urban Inflation) | CBE press release | Monthly (~10th) | Delta vs 7% ±2% target |
| Net International Reserves | CBE press release | Monthly | Rising = stable, falling = pressure |
| Brent Crude Price | Free API | Daily | >$85 = EGP pressure signal |
| Egypt 1Y CDS Spread | Manual watch | Weekly | Rising = devaluation risk |

**Key thresholds as of March 2026:**
- CBE rate: 19% overnight deposit
- Inflation: 13.4% Feb 2026 (above target, accelerating)
- Reserves: $52.7bn end Feb (healthy but being tested)
- USD/EGP: ~52.27 (up from ~46 in early February)
- Brent: ~$102/bbl (elevated, Middle East conflict premium)

---

## State Machine Logic

```
Each of 5 signals scored: +1 (bullish EGP), 0 (neutral), -1 (bearish EGP)
Composite score range: -5 to +5

Score ≥ +2          → ACCUMULATE (short USD/EGP)
Score -1 to +1      → DORMANT (no position)
Score ≤ -2          → FADE (long USD/EGP)
Divergence flag*    → CAUTION (exit all, override composite)

*Divergence = rate delta negative (cutting) AND inflation delta
 positive (rising) simultaneously
```

**Update cadence:** Weekly. State changes only on new data
publication — not on price moves. This prevents whipsawing on noise.

---

## Output

```json
{
  "pair": "USD/EGP",
  "state": "CAUTION",
  "composite_score": -1,
  "divergence_flag": true,
  "last_updated": "2026-03-18",
  "inputs": {
    "cbe_rate_delta": -1,
    "inflation_delta": +1,
    "reserves_delta": 0,
    "brent_level": -1,
    "cds_delta": 0
  },
  "next_cbe_meeting": "2026-04-02"
}
```

---

## Key Dates

| Date | Event | Relevance |
|------|-------|-----------|
| 18 Mar 2026 | CBE cut 100bps confirmed | Policy Divergence flag active |
| ~10 Apr 2026 | Egypt CPI March release | Confirms or breaks divergence |
| 2 Apr 2026 | Next CBE MPC meeting | Next potential regime switch |
| Sept 2026 | Fed expected to resume cutting | EGP benefits from weak dollar |

---

## Architecture Integration

- Same `state.json` pattern as existing CCE engines
- PM2 process scheduled weekly — not continuous (saves battery)
- Telegram notification on state change
- Low API dependency — CBE data is human-readable press releases
- Integrates with CRDR engine as the Regime dimension
- Modified by DXY layer: STRONG dollar amplifies FADE signal

---

*Giblets Creations · Internal Documentation · Not for distribution*

---

## Implementation Notes (v2.3.6)

**Configurable Divergence Thresholds**
The divergence check thresholds are now configurable. Default lowered from -0.5%/-0.5% to -0.25%/+0.25% to catch smaller CBE cuts during rising inflation. Override via inputs: `divergenceRateThreshold` and `divergenceInflationThreshold`.
