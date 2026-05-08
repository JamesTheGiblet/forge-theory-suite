# Portfolio Management
### CCE Platform — Capital Tracking & Balance

---

## Overview

CCE tracks portfolio value across two sources:
1. **Real Kraken balance** — live API call to exchange
2. **Database value** — last recorded cycle value from `cce-production.db`

The dashboard shows whichever is available, preferring the live Kraken balance.

---

## Capital Structure

| Engine | Capital | Mode | Exchange |
|--------|---------|------|----------|
| S.E Crypto | $813.54 | LIVE | Kraken (real) |
| T.E Grid | $125 virtual | DRY RUN | Simulated |
| T.E Momentum | $300 virtual | DRY RUN | Simulated |
| T.E Breakout | $100 virtual | DRY RUN | Simulated |
| T.E LCE | $100 virtual | DRY RUN | Simulated |
| S.E Forex | £300 virtual | DRY RUN | Simulated |
| S.E REIT | £300 virtual | DRY RUN | Simulated |
| S.E Stocks | £300 virtual | DRY RUN | Simulated |
| S.E Commodities | $300 virtual | DRY RUN | Simulated |
| S.E EGP | $300 virtual | DRY RUN | Simulated |

Only S.E Crypto uses real capital. All other engines run on virtual capital.

---

## Live Balance (Kraken)

The dashboard fetches the real Kraken balance on every portfolio refresh:
GET /api/portfolio
Response:
```json
{
  "totalUSD": 813.54,
  "assets": [
    {
      "symbol": "USDC",
      "amount": 813.54,
      "usdValue": 813.54,
      "price": 1,
      "percentage": 100
    }
  ],
  "timestamp": "2026-03-30T..."
}
If the Kraken API call fails, it falls back to the last recorded value in cce-production.db.
Portfolio Value Tracking
Every 4H cycle the S.E Crypto engine records:
SELECT portfolio_value FROM cce_cycles ORDER BY id DESC LIMIT 1
This value is:
Shown on the dashboard portfolio ring
Used in the history page chart
Used by CSS to calculate daily siphon cap
Used by G.O for allocation recommendations
CSS Capital Siphon
When S.E Crypto records a profitable trade:
CSS skims 20% of the profit
Daily cap: 10% of total portfolio value
Routes to BTC/Gold reserves (tracked in css-production.db)
Profit $100 → CSS takes $20 → $80 stays in engine pool
API Key Security
The Kraken API key has trade permission only:
✅ View balance
✅ Place orders
❌ Withdraw funds
Even if the API key were compromised, funds cannot be withdrawn.
Performance Tracking
Metric
Value (30 March 2026)
Started
13 March 2026
Starting capital
£300 (~$375)
Current value
$813.54
Total return
+107.7%
Days running
17
Engine state
DORMANT
Check Balance Manually
node scripts/check-balance.js
# or
curl -s http://localhost:3000/api/portfolio
Giblets Creations · v2.4.0 · March 2026
