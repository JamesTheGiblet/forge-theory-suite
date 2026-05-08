# Forensic Layer (F.L)
### Trade Autopsy & Pattern Learning System

**Status:** 🟢 Active
**Source:** `src/cce-fl-engine.js`
**Schedule:** Monday 9am (PM2 cron)
**PM2 name:** `cce-fl`

---

## Overview

The Forensic Layer runs weekly and analyses every losing trade across all engines. It identifies patterns in losses, builds doubt scores, and feeds insights back to the platform to improve future decisions.

---

## Engines Covered (8 engines)

| Engine | Database | Table |
|--------|----------|-------|
| S.E Crypto | cce-production.db | cce_cycles |
| T.E Grid | grid-production.db | grid_completed |
| T.E Momentum | mom-production.db | mom_trades |
| T.E Breakout | brk-production.db | brk_trades |
| T.E LCE | lce-production.db | lce_trades |
| S.E Fear Fade | se-fear-fade.db | ff_trades |
| S.E Alt Season | se-alt-season.db | alt_trades |
| S.E GoldForge | se-goldforge.db | gf_trades |
| S.E Underdog | se-underdog.db | ud_trades |

---

## What It Does

Each Monday at 9am:
1. Reads all trade history from each engine database
2. Identifies losing trades (pnl_pct < 0)
3. Groups losses by market conditions at time of trade
4. Calculates doubt scores per condition
5. Stores lessons in `fl-production.db`
6. Sends Telegram summary

---

## Doubt Score

A doubt score (0-100) is assigned to each market condition pattern:
- **0-30** — Low doubt, condition is reliable
- **30-60** — Medium doubt, proceed with caution
- **60-100** — High doubt, avoid trading in this condition

---

## Output
fl-production.db
fl_lessons   — individual trade analysis records
fl_patterns  — aggregated condition patterns with doubt scores
---

## Telegram Report (Monday 9am)
[F.L] 📋 Weekly Forensic Report
Engines analysed: 9
Total trades: 47
Losing trades: 12 (25.5%)
Top loss patterns:
• High VIX + F&G < 20: doubt 72
• BTC dom > 58% + alt position: doubt 65
• Grid recentre within 2H: doubt 58
Lessons stored: 12
---

## PM2 Schedule

```bash
pm2 start src/cce-fl-engine.js \
  --name cce-fl \
  --cron "0 9 * * 1" \
  --no-autorestart
Manual Run
node src/cce-fl-engine.js
Giblets Creations · v1.1 · March 2026
