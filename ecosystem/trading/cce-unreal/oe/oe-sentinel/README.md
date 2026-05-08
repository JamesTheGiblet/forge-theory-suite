# O.E Sentinel
### Cross-Engine Anomaly Detection — Platform Intelligence Layer

**Classification:** Internal · Proprietary
**Type:** Observer Engine (passive — does not trade)
**Cycle:** 15 minutes
**Status:** 🟢 Active

---

## What Is O.E Sentinel?

O.E Sentinel is the platform's early warning system. It runs alongside
all other engines and continuously monitors for anomalies — conditions
that are unusual, contradictory, or potentially dangerous across the
platform and markets.

Sentinel does not trade. It does not modify engine behaviour. It watches,
analyses, and alerts. Think of it as the platform's immune system —
it does not fight battles, it identifies threats.

---

## Why Sentinel Exists

A platform running 11 engines simultaneously across multiple asset
classes can develop blind spots. Each engine is expert in its own domain
but has no visibility into what the others are doing or what the broader
market context looks like from above.

Sentinel sits above all engines and asks questions none of them can ask
individually:

- Are multiple engines in contradictory states?
- Is an engine behaving differently from its historical pattern?
- Are two markets that usually move together suddenly diverging?
- Is a macro signal flashing that none of the individual engines detect?

These cross-engine, cross-market questions require a dedicated observer.
That observer is Sentinel.

---

## What It Monitors

**Engine State Anomalies**
- Engines stuck in a state longer than historical average
- Multiple engines simultaneously in high-risk states
- Unexpected state transitions without clear market trigger

**Market Anomalies**
- Correlation breakdowns between usually correlated assets
- Extreme readings on macro indicators (F&G, VIX, DXY)
- Divergence between related markets (Oil/Gold, BTC/Alts)

**Policy Anomalies**
- Central bank policy divergence (rate direction vs inflation)
- Yield curve conditions affecting rate-sensitive engines
- Currency regime signals (EGP, DXY extremes)

---

## Anomaly Severity Levels

| Level | Colour | Meaning |
|-------|--------|---------|
| INFO | Blue | Notable condition worth monitoring |
| WARN | Amber | Unusual condition requiring attention |
| ALERT | Red | Significant anomaly — review recommended |

---

## Current Active Anomaly Examples

Sentinel has previously flagged:

- **EGP Policy Divergence** — CBE cutting rates while inflation rising.
  Score 0. Exit all EGP positions. *(WARN)*

- **Oil/Gold Correlation Breakdown** — Correlation dropped to -0.5.
  COMO cascade reliability reduced. *(INFO)*

- **T.E Breakout Squeeze** — BTC, ETH and SOL all squeezing
  simultaneously. High-volatility breakout imminent. *(WARN — Resolved)*

---

## The Golden Rule

**Sentinel never affects engine behaviour.**

It reads engine state properties. It writes only to its own database.
It sends Telegram alerts prefixed `[SEN]`. It has no mechanism to
modify, pause, or override any engine.

This is enforced architecturally.

---

## Dashboard Integration

Sentinel is visible in two places:

**Command Dashboard** — O.E SEN card shows ANOM, WARN, ALRT, TOT
counts. Status shows WARNING or ALERT when anomalies are active.
Click the card to open the full Sentinel modal.

**Sentinel Modal** — Shows active anomalies with full description,
severity badge, and timestamp. Recent history shows resolved anomalies.
Displays total detected, total cycles, and last run time.

---

## Storage

Sentinel maintains its own database at `data/sentinel-production.db`:

- `sentinel_anomalies` — all detected anomalies with severity,
  description, timestamp, and resolution status
- `sentinel_cycles` — cycle log with anomaly counts per run

---

*Giblets Creations · Internal Documentation · Not for distribution*
*"I wanted it. So I forged it. Now forge yours."*
