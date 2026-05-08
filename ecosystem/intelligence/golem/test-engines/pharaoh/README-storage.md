# Data Storage Files

## pharaoh-state.json
Current engine state. Updated every cycle.

| Field | Description |
|-------|-------------|
| `capital` | Current trading capital in USDC |
| `egyptFund` | Accumulated Egypt fund |
| `totalProfit` | Total profit all cycles |
| `cyclesCompleted` | Number of completed cycles |
| `currentState` | DORMANT/WATCHING/LOADED/HOLDING/EXITING/STOPPED |
| `entryPrice` | Price position was opened (null if no position) |
| `entryDate` | Date position was opened |
| `entryFG` | Fear & Greed at entry |
| `lastUpdate` | Last state update timestamp |

## pharaoh-history.json
History of completed cycles.

| Field | Description |
|-------|-------------|
| `cycleNumber` | Sequential cycle number |
| `timestamp` | When cycle completed |
| `entryPrice` | Buy price |
| `exitPrice` | Sell price |
| `profit` | Profit in USDC |
| `egyptContribution` | 15% of profit to Egypt fund |
| `newCapital` | Capital after cycle |
| `newEgyptFund` | Egypt fund after cycle |

## xrp-price-history.json
Price history for RSI and 30-day high calculations.

| Field | Description |
|-------|-------------|
| `timestamp` | Unix timestamp (milliseconds) |
| `price` | XRP/USDC price |

## View Commands

```bash
# View current state
cat data/pharaoh-state.json | jq '.'

# Count price history points
cat data/xrp-price-history.json | jq '. | length'

# View last completed cycle
cat data/pharaoh-history.json | jq '.[0]'

# Watch state file update
watch -n 360 'cat data/pharaoh-state.json | jq ".capital, .egyptFund, .currentState"'
```

