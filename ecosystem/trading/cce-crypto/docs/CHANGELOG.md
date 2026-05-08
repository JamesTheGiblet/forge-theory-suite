# CCE Changelog
### Version History — Cascade Compounding Engine

---

## v2.4.0 — 31 March 2026

### New Engines
- **S.E Fear Fade** — Counter-cyclical BTC sentiment engine. Buys Extreme Fear, sells Greed.
- **S.E GoldForge** — XAUT/USDT on Kraken. Trades Tether Gold during crypto fear spikes.
- **S.E Alt Season** — BTC dominance rotation into ETH/SOL when dom < 50%.
- **S.E Underdog** — Quality beaten-down alt basket (ALGO/DOT/ATOM/VET) at extreme fear.

### Infrastructure
- **VPS deployed** — Hetzner CX22, Helsinki, 65.21.244.131
- **CCE Control** — Client management dashboard on port 3002
- **Tier system** — Starter/Advanced/Full platform tiers with engine gating
- **Dashboard tier badge** — Platform lock with upgrade popup
- **Engine Registry** — Auto-loader for dynamic engines from `/engines/` directory

### Integration
- All new engines connected to Observer, Sentinel, Forensic Layer, G.O
- Sentinel upgraded to watch 15 engines
- Observer reads state from all registry engines
- FL Forensic covers all new engine trade databases

### Commercial
- Service agreement v1.1 — tiered siphon (10/12/15%)
- VPS onboarding documented — 30 min per client
- CCE Control auto-seeds personal account from env vars
- Client tier locking on dashboard

### Documentation
- ENGINE_REGISTRY.md
- TIER_SYSTEM.md
- SE_ENGINES_KRAKEN.md
- VPS_DEPLOYMENT.md
- VPS_ONBOARDING.md
- CCE_CONTROL.md
- SERVICE_AGREEMENT.md
- CHANGELOG.md

---

## v2.3.0 — 30 March 2026

### New
- G.O Orchestrator — cross-engine capital allocation and advisory layer
- AI Optimizer — weekly strategy optimization cron
- S.E Fear Fade v0.1 — initial concept build
- CCE Control v1.0 — first client management dashboard
- VPS initial deployment — Hetzner Helsinki

### Fixes
- G.O storage async init fixed
- Strategist analysis errors resolved
- Shutdown handler moved after engine declarations
- Trailing stop adjusted 2.1% → 3.5%

### Commercial
- Service agreement v1.0
- LinkedIn post — 161 impressions
- Gumroad handbook live at £49

---

## v2.2.0 — March 2026

### New
- O.E Sentinel — 11-rule anomaly detection across all engines
- O.E Strategist — pattern analysis from Observer data
- Weather Engine — agricultural commodity signals (6 crops)
- CSS tiered siphon — 10/12/15% based on return

### Fixes
- Dashboard Bloomberg terminal aesthetic locked in
- Portfolio history page built
- Multiple zombie engine fixes (RNDR, ETH, SOL price keys)

---

## v2.1.0 — March 2026

### New
- T.E Grid — 10-level BTC/USDC grid bot
- T.E Momentum — EMA crossover engine
- T.E Breakout — Bollinger squeeze engine
- T.E LCE — Liquidation cascade engine (Binance)
- O.E Observer — cross-engine snapshot system
- F.L Forensic Layer — trade autopsy on losing trades
- CCE Audit — daily health check cron

### Architecture
- PM2 multi-process deployment on S24
- sql.js database per engine
- CCXT exchange connector
- Telegram notification service

---

## v2.0.0 — February 2026

### New
- S.E Crypto — full cycle BTC/USDC strategic engine
- S.E Forex — EUR/USD oversold fade (dry run)
- S.E REIT — real estate momentum (dry run)
- S.E Stocks — SPY tracker (dry run)
- S.E Commodities — Oil/Gold rotation (dry run)
- S.E EGP — Egypt policy divergence (dry run)
- CCE Capitulation Signal — 4-condition, 93% win rate
- CRDR Engine — Cycle·Regime·Dominance·Rotation analysis

### Platform
- Node.js runtime on Samsung S24 Ultra via Termux
- PM2 process management
- Dashboard v1.0

---

## v1.0.0 — February 2026

### Initial
- CCE concept and discipline contract (90 days, £300 capital)
- BTC historical data analysis
- First strategy: CASCADE signal
- BuddAI integration concept
- Forge Theory application to trading

---

*Giblets Creations · CCE Platform*
*"I wanted it. So I forged it. Now forge yours."*
