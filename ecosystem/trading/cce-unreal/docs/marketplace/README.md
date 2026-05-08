# Marketplace

The CCE Marketplace is where builders sell validated engines and buyers deploy proven strategies. It's accessible at `http://localhost:3000/marketplace`.

---

## The Trust Model

The fundamental problem with strategy marketplaces is that sellers can cherry-pick their best results. CCE solves this with pipeline-signed metrics.

| Traditional Marketplace | CCE Marketplace |
|------------------------|-----------------|
| Seller uploads backtest | Pipeline generates metrics |
| Results can be cherry-picked | Same code the buyer runs |
| No OOS validation | IS/OOS split enforced |
| Metrics unverifiable | Signed by pipeline hash |
| No stress test | 2018, 2020, 2022 tested |

---

## The Metrics Card

Every listing includes a signed metrics card produced by Pipeline Step 5:

| Metric | Minimum to list |
|--------|----------------|
| **OOS CAGR** | ≥30% |
| **OOS Sharpe** | ≥1.5 |
| **Max Drawdown** | ≤30% |
| **OOS Calmar** | ≥1.0 |
| **OOS/IS Ratio** | ≥0.6 |
| **OOS Trades** | ≥30 |
| **Beats benchmark** | Yes (Sharpe AND Calmar) |

The metrics card also includes:
- Walk-forward results (min/max/mean Sharpe across rolling 1-year windows)
- Stress test results (max drawdown during 2018, 2020, 2022 crash periods)
- Refinement cycles used (how many times the pipeline adjusted parameters)
- Code version tag (links the listing to the exact engine build)

---

## Engine Types

| Type | Ecosystem | Purpose | Examples |
|------|-----------|---------|---------|
| **Strategic** | S.E | Long-term trend following, weeks to months | S.E Crypto, S.E Forex, S.E EGP |
| **Tactical** | T.E | Short-term active trading, minutes to hours | T.E Grid, T.E LCE, T.E Breakout |
| **Observer** | O.E | Passive intelligence, no capital deployed | O.E Observer, O.E Strategist |

---

## Current Listings

| Engine | Price | OOS CAGR | OOS Sharpe | MaxDD |
|--------|-------|----------|------------|-------|
| S.E Crypto | £199 | +847% | 2.14 | -28% |
| T.E LCE Liquidation | £129 | +389% | 2.31 | -15% |
| T.E Grid BTC | £149 | +212% | 1.95 | -19% |
| S.E EGP/USD | £79 | +167% | 1.61 | -22% |
| S.E Forex EUR/USD | £99 | +34% | 1.72 | -11% |
| O.E Observer | FREE | N/A | N/A | N/A |

---

## Revenue Model

| Tier | Price | Description |
|------|-------|-------------|
| **Community** | Free | Open source, unvalidated |
| **Pro** | £29–£199 one-time | Pipeline-validated, signed metrics |
| **Subscription** | £19/mo | Access to all Giblets Creations engines |

Revenue split on paid listings: **70% to author, 30% to platform**.

```
Sale at £99:
  Platform fee:  £29.70
  Your share:    £69.30
  10 sales:      £693
  100 sales:     £6,930
```

---

## Selling Your Engine

### Step 1 — Build with the Framework

```bash
cce new-engine my-engine --type strategic --cycle 4H
# Implement strategy.js and engine.js
cce validate my-engine
```

### Step 2 — Run the Pipeline

```bash
# Create a target spec
cp pipeline/targets/template.json pipeline/targets/my-engine.json
# Edit my-engine.json — set hypothesis, asset universe, success criteria

# Run the pipeline
node pipeline/cce-pipeline.js --target pipeline/targets/my-engine.json
```

The pipeline runs five steps and produces `pipeline/runs/<timestamp>/metrics_card.json`. If the strategy passes all gates, `deploy_status` is `APPROVED`.

### Step 3 — Create Your Listing

At launch, listings are managed manually by Giblets Creations. To submit your engine:

1. Ensure `deploy_status: APPROVED` in your metrics card
2. Submit via the marketplace seller form (coming soon)
3. Engine is reviewed and listed within 48 hours
4. Receive 70% of every sale via Stripe

### Step 4 — Buyers Deploy

Buyers receive a signed zip with a licence key. The engine validates the key on start:

```javascript
// Engine checks licence on every start
const licence = GOLicenceReader.check(config.licenceKey);
if (!licence.valid) throw new Error('Invalid licence — purchase at marketplace');
```

---

## Buying an Engine

1. Browse `http://localhost:3000/marketplace`
2. Filter by type (Strategic/Tactical/Observer) or price
3. Read the signed metrics card — all figures are pipeline-verified
4. Click BUY and complete payment
5. Receive signed zip by email
6. Deploy:

```bash
# Unzip to engines/ folder
unzip my-engine.zip -d ~/cce-crypto/engines/

# Add config block from README
# (config block is printed in the engine's README.md)

# Validate
cce validate my-engine

# Restart — engine is auto-detected
pm2 restart cce-bot

# Verify
cce list
```

---

## After Purchase — The Seven Day Protocol

Before deploying real capital:

| Day | Action |
|-----|--------|
| 1–3 | Run in dry run. Watch every cycle log. |
| 4–5 | Verify signals are computing correctly. Watch state transitions. |
| 6 | Load the engine's metrics card in backtest replay. Watch it trade through the validation period. |
| 7 | If everything looks right, consider enabling with minimum capital. |

Never skip dry run. The metrics card shows past performance — your data feed, your exchange, and your config may behave differently.
