# CCE Release Notes
### Latest Release — v2.4.0 · 31 March 2026

---

## v2.4.0 — What's New

### 4 New S.E Engines on Kraken
The platform now has 5 Strategic Engines running on Kraken alone — no broker required for Starter tier clients.

**S.E Fear Fade** buys BTC at Extreme Fear (F&G ≤ 20) and sells when Greed returns. Currently WATCHING at F&G 11.

**S.E GoldForge** trades XAUT/USDT — Tether Gold on Kraken. Gold rises when crypto crashes. Enters on fear, exits when crypto recovers. Currently WATCHING.

**S.E Alt Season** rotates into ETH/SOL when BTC dominance drops below 50%. Captures the second leg of the bull run. Currently DORMANT (dom 56%).

**S.E Underdog** buys a quality basket of ALGO/DOT/ATOM/VET during extreme fear. These fundamentally sound projects move 3-5x when capital rotates back. Currently DORMANT.

### VPS Infrastructure
CCE now runs on a Hetzner server in Helsinki (65.21.244.131). Client instances deploy in 30 minutes. Dashboard accessible from any phone, anywhere.

### Client Tier System
Three tiers: Starter (Kraken, £200), Advanced (+ Binance, £300), Full Platform (+ broker, £500). Dashboard locked to purchased tier. Engine gating at startup — clients only run what they paid for.

### CCE Control
Master client dashboard on port 3002. Shows all client balances, returns, setup fees, and siphon earned. Auto-seeds personal account from env vars.

---

## Current Platform Status

| Metric | Value |
|--------|-------|
| Live engines | 19 |
| Kraken engines | 11 (Starter tier) |
| Real capital | $521.83 |
| Simulated return | +107.7% |
| VPS uptime | 11h |
| Docs | 30 |
| G.O baseline | Cycle 5/24 |

---

## Known Issues

| Issue | Status |
|-------|--------|
| Kraken exchange logo not rendering in dashboard | In progress |
| OBS showing UNKNOWN for Crypto on first cycle | Resolves after cycle 2 |
| CSS siphon not yet tracking new engines | Planned |
| VPS nonce conflict if same keys used twice | Resolved — VPS uses DRY RUN |

---

## Next Release — v2.5.0 (Planned)

- S.E Longshot engine (when F&G > 50)
- Binance futures setup for T.E LCE
- Domain + SSL for VPS
- Client onboarding questionnaire
- Automated monthly report per client
- CCE Control siphon tracking from CSS engine

---

*Giblets Creations · v2.4.0 · March 2026*
