#!/bin/bash

echo "========================================"
echo "Three Asset Portfolio - Daily Report"
echo "Date: $(date)"
echo "========================================"

# Read the latest state
if [ -f ~/cce/engines/three-asset-portfolio/portfolio_state.json ]; then
    echo ""
    echo "Current Status:"
    cat ~/cce/engines/three-asset-portfolio/portfolio_state.json | jq '.stats | {trades: (.trades | length), wins, losses, capital}'
    echo ""
    echo "Recent Trades:"
    cat ~/cce/engines/three-asset-portfolio/portfolio_state.json | jq '.stats.trades[-3:] | .[] | {asset, pnlPct, reason, exitDate}'
else
    echo "No state file found"
fi

echo ""
echo "========================================"
