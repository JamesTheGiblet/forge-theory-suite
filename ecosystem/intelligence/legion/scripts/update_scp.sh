#!/bin/bash
cd ~/legion

ACTIVE_STRATS=$(ls -1 strategies/active/*.json 2>/dev/null | wc -l)
TOURNAMENT_COUNT=$(cat data/tournament.json 2>/dev/null | jq '.active | length' 2>/dev/null || echo "0")
BREACHES=$(cat data/containment_log.json 2>/dev/null | jq '. | length' 2>/dev/null || echo "0")
LINEAGES=$(cat data/lineage_history.json 2>/dev/null | jq '. | length' 2>/dev/null || echo "0")
PAPER_HOURS=$(tail -1 data/paper_mode.log 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "42")
BTC_PRICE=$(node -e "const {getCurrentPrice}=require('./shared/kraken_adapter'); getCurrentPrice('BTC/USD').then(p=>console.log(p))" 2>/dev/null | tail -1 || echo "76551")
SENTIMENT=$(node -e "const {getSentiment}=require('./shared/sentiment'); const s=getSentiment(); console.log(s ? s.value : 'unknown')" 2>/dev/null | tail -1 || echo "unknown")

jq --argjson active "$ACTIVE_STRATS" \
   --argjson tournament "$TOURNAMENT_COUNT" \
   --argjson lineages "$LINEAGES" \
   --argjson breaches "$BREACHES" \
   --argjson hours "$PAPER_HOURS" \
   --argjson btc "$BTC_PRICE" \
   --argjson sentiment "$SENTIMENT" \
   '.current_state.active_strategies = $active |
    .current_state.tournament_contestants = $tournament |
    .current_state.chameleon_lineages = $lineages |
    .current_state.containment_breaches = $breaches |
    .current_state.paper_mode_remaining_hours = $hours |
    .current_state.btc_price = $btc |
    .current_state.sentiment = $sentiment |
    .paper_mode.current_breaches = $breaches |
    .paper_mode.remaining_hours = $hours |
    .chameleon_lm.tracking = $lineages' \
   SCP.json > SCP.json.tmp && mv SCP.json.tmp SCP.json

echo "✅ SCP.json updated: $ACTIVE_STRATS strategies | $TOURNAMENT_COUNT tournament | $LINEAGES lineages | $BREACHES breaches | ${PAPER_HOURS}h left | BTC: $$BTC_PRICE | Sentiment: $sentiment"
