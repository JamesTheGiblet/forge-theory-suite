Capital Siphon System (CSS)

Profit Skimming · Audit‑Gated · Reserve Feeding

Classification: Internal · Operational
Type: Independent daemon
Authority: Moves capital from engine profit pools to BTC/Gold funds (via Capital Layer)
Status: 🟢 Live – v1.0 | Running as daily cron (midnight) via PM2

---

1. Role

CSS exists to skim a slice of verified, realised profit from any winning engine and route it upward to the reserve assets (BTC and Gold). It does not touch engine logic, does not reinvest, and does not interfere with normal allocation. It only acts when the Auditor has signed off on the profit as clean and real.

The prime directive:

When a positive, audited return is detected, siphon a defined slice upward to BTC/Gold reserves, leaving the remainder to be reinvested as per normal allocation.

---

2. Dependencies

CSS reads from:

· Auditor – to get cleared PnL records (status = OK).
· Capital Layer – to know current fund balances, allocation weights, and siphon limits.
· Config – for parameters like siphon rate, thresholds, caps.
· Siphon events table – to avoid double‑skimming.

CSS writes to:

· Siphon events table – recording each siphon.
· Capital Layer API – to update fund balances (POST /api/capital/siphon).

CSS never directly touches engines, nor does it read engine configuration.

---

3. Data Inputs

From Auditor (trusted source)

Field Description
engine_id Which engine generated the profit
period_start / period_end The period over which the PnL was realised
realised_pnl_usd The profit amount in USD
status OK, WARNING, BLOCKED – only OK is processed
siphoned Flag to mark if already processed (set by CSS)

From Capital Layer

Field Description
btc_fund_usd Current capital in BTC fund
gold_fund_usd Current capital in gold fund
target_btc_allocation Current target allocation (for deciding destination)
max_daily_siphon_pct_total_capital Hard cap on total siphoned per day (percentage)

From Config (.env or database)

Parameter Description
CSS_MIN_PNL_THRESHOLD_USD Ignore tiny profits (e.g., $10)
CSS_SIPHON_RATE Percentage of realised profit to siphon (e.g., 0.2 = 20%)
CSS_MAX_DAILY_SIPHON_PCT Maximum percentage of total capital that can be siphoned in a day
CSS_BIAS_MODE AUTO, BTC, GOLD, BALANCED – how to choose destination
CSS_POLL_INTERVAL_MS How often CSS runs (e.g., 60000 = 1 minute)

---

4. Core Behaviour

CSS runs as a daemon (e.g., a Node.js process under PM2) that wakes up every CSS_POLL_INTERVAL_MS and:

1. Query Auditor for new, cleared PnL
   · Select records where status = 'OK' and siphoned = 0 and realised_pnl_usd > CSS_MIN_PNL_THRESHOLD_USD.
2. For each eligible record:
   · Compute siphon amount: siphon_amount = realised_pnl_usd * CSS_SIPHON_RATE.
   · Apply daily cap: ensure total siphoned today + siphon_amount ≤ CSS_MAX_DAILY_SIPHON_PCT * total_capital (where total_capital = btc_fund_usd + gold_fund_usd). If cap would be exceeded, either reduce the siphon amount or skip.
3. Determine destination fund:
   · If CSS_BIAS_MODE = 'BTC': always send to BTC fund.
   · If 'GOLD': always send to gold fund.
   · If 'BALANCED': split 50/50 between BTC and gold.
   · If 'AUTO': ask Capital Layer for current target_btc_allocation and split accordingly (e.g., if allocation is 70% BTC, send 70% of siphon to BTC, 30% to gold).
4. Emit siphon event:
   · Record in siphon_events table with reason = 'engine_profit', trigger_value = realised_pnl_usd, from_engine = engine_id, to_fund = selected fund(s), amount_usd = siphon_amount.
5. Call Capital Layer API:
   · POST /api/capital/siphon with payload containing from: 'engine_pool', to: fund(s), amount_usd: siphon_amount.
   · Capital Layer updates btc_fund_usd and gold_fund_usd accordingly.
6. Mark PnL record as siphoned:
   · Update the audited PnL record: set siphoned = 1.
7. Leave remainder in engine pool:
   · The non‑siphoned portion of the profit (realised_pnl_usd - siphon_amount) remains in the engine’s capital pool to be reinvested by SAA and the engines themselves. CSS does not interfere with that.

---

5. Safety & Constraints

· Auditor gate: Only status = OK PnL is considered. If Auditor reports WARNING or BLOCKED, CSS does nothing.
· Read‑only on engines: CSS never modifies engine balances directly. It only communicates with the Capital Layer.
· Daily cap: Hard limit prevents draining too much capital in a single day, preserving liquidity for reinvestment.
· No negative siphon: CSS never siphons from losses. It only moves positive, realised profit.
· Idempotent: Each PnL period is processed only once (siphoned flag ensures no double‑skimming).
· Failure handling: If the Capital Layer API call fails, CSS retries (with backoff) and leaves the PnL record un‑siphoned for the next cycle.

---

6. Storage

Table audited_pnl (owned by Auditor, read‑only for CSS)

Column Type Description
id INTEGER PRIMARY KEY Auto‑increment
engine_id TEXT e.g., cry, grid, mom
period_start DATETIME Start of period
period_end DATETIME End of period
realised_pnl_usd REAL Profit in USD
status TEXT OK, WARNING, BLOCKED
siphoned INTEGER 0 or 1 – set by CSS

Table siphon_events

Column Type Description
id INTEGER PRIMARY KEY Auto‑increment
timestamp DATETIME When siphon occurred
from_engine TEXT Engine that generated the profit
to_fund TEXT BTC, GOLD, or BOTH
amount_usd REAL Amount moved
reason TEXT engine_profit (others later)
trigger_value REAL The realised PnL that triggered it

---

7. Implementation Plan

Phase 1 – Core Daemon (v0.1)

· Create tables.
· Write a small Node.js script cce-css.js that polls every minute, reads from audited_pnl, applies siphon logic, and updates Capital Layer.
· Add config parameters to .env.
· Run as a PM2 process.

Phase 2 – Integration with Auditor (v0.2)

· Ensure Auditor writes realised_pnl_usd and sets status = OK for verified profits.
· CSS will only act when Auditor says OK.

Phase 3 – Bias Modes (v0.3)

· Implement AUTO bias reading from Capital Layer’s target allocation.
· Test with different regimes.

Phase 4 – Dashboard & Monitoring (v0.4)

· Add a dashboard card showing recent siphon events, daily totals, and current bias mode.
· Telegram alerts for large siphons or when caps are approached.

---

8. Why CSS Matters

CSS closes the capital loop. It ensures that:

· Profits are not left idly in engine pools – they are systematically moved to the reserve assets (BTC and gold), which have long‑term survivability.
· The system builds wealth – over time, the reserves grow, providing a stable base for future experimentation.
· The Auditor is respected – only verified, clean profits are skimmed; nothing is taken on speculation.

Together with the Capital Layer and Anchor Rotation, CSS forms a complete capital management system that mimics how real macro funds operate: activity generates, reserves accumulate, and the reserves themselves can be rotated based on conviction.

## Current Implementation (v1.0)

CSS is live as a daily cron script (`src/cce-css-engine.js`), running at midnight via PM2.

**What is implemented:**
- Scans MOM, BRK, GRID, LCE databases for unprocessed profitable trades
- Applies 20% siphon rate on profits over $10
- 10% daily cap on total capital
- Records siphon events to css-production.db
- Telegram notification on siphon events
- Dashboard widget showing recent siphons

**What is planned (future phases):**
- Auditor gate (currently reads directly from engine DBs)
- Capital Layer API integration
- AUTO bias mode (BTC vs Gold routing)
- Anchor Rotation integration

**PM2:** `cce-css` | Cron: `0 0 * * *` | DB: `data/css-production.db`

---

Giblets Creations · Internal Documentation
Capital Siphon System (CSS) · v1.0 (Live) — Full design v2.0 pending

