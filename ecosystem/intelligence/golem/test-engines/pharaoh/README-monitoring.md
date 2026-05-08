# Monitoring & Troubleshooting

## View Status

```bash
# PM2 process status
pm2 list

# Quick safety status
test -f SAFETY_LOCK && echo "🔒 SAFE (DRY RUN)" || echo "⚠️ LIVE ENABLED"

# Current engine state
cat data/pharaoh-state.json | jq '.currentState, .capital, .egyptFund'
```

Logs

```bash
# Live logs (follow)
pm2 logs pharaoh

# Last 20 lines
pm2 logs pharaoh --lines 20 --nostream

# Error logs only
pm2 logs pharaoh --err --lines 20 --nostream

# Output logs only
pm2 logs pharaoh --out --lines 20 --nostream

# Clear logs
pm2 flush pharaoh
```

Price History

```bash
# Number of data points
cat data/xrp-price-history.json | jq '. | length'

# Last price
cat data/xrp-price-history.json | jq '.[-1].price'

# 30-day high (once enough data)
cat data/xrp-price-history.json | jq '[.[].price] | max'
```

Cycle Progress

```bash
# Last cycle time
cat data/pharaoh-state.json | jq '.lastUpdate'

# Time until next check
# Engine runs every 6 hours from last cycle
```

Common Issues

"No Kraken API keys"

```bash
# Check .env exists
ls -la ~/pharaoh-engine/.env

# Check keys are set
grep KRAKEN ~/pharaoh-engine/.env
```

"Cannot connect to Kraken"

```bash
# Check internet
ping -c 3 api.kraken.com

# Check API key permissions
# Must have trade permissions
```

Engine not progressing

```bash
# Check state
cat data/pharaoh-state.json | jq '.currentState'

# DORMANT = waiting for F&G ≤ 25
# WATCHING = waiting for entry conditions
# LOADED/HOLDING = position open
```

Price history not building

```bash
# Check data points
cat data/xrp-price-history.json | wc -l

# Need ~120 points for 30-day high
# Each cycle adds 1 point every 6 hours
# 30 days = 120 points
```

Performance Metrics

```bash
# Total profit
cat data/pharaoh-state.json | jq '.totalProfit'

# Egypt fund progress
cat data/pharaoh-state.json | jq '.egyptFund'

# Completed cycles
cat data/pharaoh-state.json | jq '.cyclesCompleted'

# Current drawdown (if in position)
# Calculated from entryPrice vs current XRP
```

Emergency Stop

```bash
# Stop engine immediately
pm2 stop pharaoh

# Re-engage safety locks
echo "LOCKED" > SAFETY_LOCK
rm -f .LIVE

# Restart in dry run
pm2 restart pharaoh
```

Force Reset (Start Fresh)

```bash
# Stop engine
pm2 stop pharaoh

# Backup current data
mkdir -p backup
cp data/*.json backup/

# Reset state files
rm -f data/*.json

# Restart (will recreate fresh files)
pm2 restart pharaoh
```

