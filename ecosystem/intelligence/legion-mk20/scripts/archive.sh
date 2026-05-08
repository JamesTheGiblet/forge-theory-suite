#!/bin/bash
# Archive, never delete

STRATEGY=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -f "data/strategies/$STRATEGY" ]; then
  mv "data/strategies/$STRATEGY" "archive/strategies/${TIMESTAMP}_${STRATEGY}"
  echo "📦 Archived: $STRATEGY (never deleted)"
else
  echo "⚠️ Strategy not found: $STRATEGY"
fi
