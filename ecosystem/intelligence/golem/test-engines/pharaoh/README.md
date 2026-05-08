# 🏺 S.E Pharaoh — XRP Sentiment Engine

**Fund the Egypt trip through XRP's extreme sentiment cycles.**

## Quick Links

| Document | Description |
|----------|-------------|
| [README-pharaoh.md](README-pharaoh.md) | Main engine code documentation |
| [README-strategy.md](README-strategy.md) | Trading strategy & entry/exit rules |
| [README-safety.md](README-safety.md) | 4-lock safety system |
| [README-setup.md](README-setup.md) | Installation & configuration |
| [README-storage.md](README-storage.md) | Data storage files |
| [README-monitoring.md](README-monitoring.md) | Logs, monitoring & troubleshooting |

## One-Line Summary

Buys XRP during extreme fear + capitulation (5 conditions), sells when greed returns or profit target hit. 15% of each profit to Egypt fund.

## Quick Start

```bash
# Install
cd ~/pharaoh-engine
npm install

# Configure
nano .env                    # Add your Kraken API keys

# Run (dry run — safe)
pm2 start pharaoh.js --name pharaoh
pm2 save

# Monitor
pm2 logs pharaoh
```

Safety First

4 locks must be disengaged to enable live trading:

```bash
# Check safety status
test -f SAFETY_LOCK && echo "🔒 SAFE (DRY RUN)" || echo "⚠️ LIVE ENABLED"
```

See README-safety.md for full details.

Core Metrics

Metric Value
Asset XRP/USDC on Kraken
Seed Capital $250 (~£200)
Egypt Target $1000 (~£800)
Timeframe 331 days (by 4th March 2027)
Cycle 6 hours

Entry Conditions (ALL 5)

Condition Threshold
Fear & Greed ≤ 20
XRP drop from 30d high ≥ 25%
XRP RSI ≤ 35
BTC dominance ≥ 54%
Volume spike ≥ 1.5x

See README-strategy.md for full strategy details.

State Machine

```
DORMANT → WATCHING → LOADED → HOLDING → EXITING → DORMANT
```

Egypt Fund Example

Cycle Start Profit Egypt (15%) New Capital
1 $250 +40% $15 $335
2 $335 +40% $20 $449
3 $449 +40% $27 $602
4 $602 +40% $36 $807
5 $807 +40% $48 $1082

After 5 cycles: Egypt fund ~$146, Capital ~$1082

File Structure

```
~/pharaoh-engine/
├── pharaoh.js              # Main engine
├── .env                    # API keys (keep secret!)
├── SAFETY_LOCK             # Safety engaged (delete to enable live)
├── .LIVE                   # Live flag (create to enable live)
├── data/
│   ├── pharaoh-state.json  # Current capital, fund, position
│   ├── pharaoh-history.json # Cycle history
│   └── xrp-price-history.json # Price data
├── README.md               # This file
├── README-pharaoh.md       # Engine documentation
├── README-strategy.md      # Strategy documentation
├── README-safety.md        # Safety system
├── README-setup.md         # Installation guide
├── README-storage.md       # Data storage
└── README-monitoring.md    # Monitoring & troubleshooting
```

Commands Cheat Sheet

```bash
# Start
pm2 start pharaoh.js --name pharaoh

# Stop
pm2 stop pharaoh

# Restart
pm2 restart pharaoh

# Logs
pm2 logs pharaoh

# Status
pm2 list
cat data/pharaoh-state.json | jq '.currentState, .capital, .egyptFund'

# Safety status
test -f SAFETY_LOCK && echo "🔒 DRY RUN" || echo "⚠️ LIVE ENABLED"
```

Going Live (All 4 steps)

```bash
# Step 1
rm ~/pharaoh-engine/SAFETY_LOCK

# Step 2
touch ~/pharaoh-engine/.LIVE

# Step 3
LIVE=true pm2 restart pharaoh

# Step 4
# Type: I UNDERSTAND THE RISK
```

Author

James Gilbert — Giblets Creations
Oxfordshire, UK

---

"I wanted it. So I forged it. Now forge yours." 🏺
