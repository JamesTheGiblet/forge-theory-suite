#!/data/data/com.termux/files/usr/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${YELLOW}CCE Signal Monitor Status${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# Check if monitor is running
if pgrep -f "python.*cap_signal.py" > /dev/null; then
    echo -e "${GREEN}● Monitor: RUNNING${NC}"
else
    echo -e "${RED}○ Monitor: STOPPED${NC}"
fi

# Show last run time
if [ -f logs/monitor.log ]; then
    LAST_RUN=$(tail -1 logs/monitor.log | cut -d' ' -f1-2)
    echo -e "Last run: ${YELLOW}${LAST_RUN:-Unknown}${NC}"
fi

# Show current signal
if [ -f state/current_state.json ]; then
    SCORE=$(python3 -c "import sys, json; print(json.load(open('state/current_state.json'))['capSignal']['score'])" 2>/dev/null)
    MULT=$(python3 -c "import sys, json; print(json.load(open('state/current_state.json'))['capSignal']['multiplier'])" 2>/dev/null)
    
    case $SCORE in
        4) COLOR=$RED ;;
        3) COLOR=$YELLOW ;;
        2) COLOR=$BLUE ;;
        *) COLOR=$GREEN ;;
    esac
    
    echo -e "Signal: ${COLOR}Score $SCORE/4 (${MULT}x)${NC}"
    
    # Show conditions
    python3 -c "
import sys, json
data = json.load(open('state/current_state.json'))
c = data['capSignal']['conditionsMet']
print(f'\nConditions:')
print(f'  Extreme Fear:     {"✅" if c[0] else "❌"}')
print(f'  DOM Drop:         {"✅" if c[1] else "❌"}')
print(f'  Bear Structure:   {"✅" if c[2] else "❌"}')
print(f'  Not Overextended: {"✅" if c[3] else "❌"}')
"
else
    echo -e "${RED}No signal data yet${NC}"
fi

echo -e "${BLUE}════════════════════════════════════════${NC}"
