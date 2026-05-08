#!/data/data/com.termux/files/usr/bin/bash
PREV_SCORE=$(cat ~/cce/score_history.txt 2>/dev/null || echo "0")
CUR_SCORE=$(cat ~/cce/state.json | python3 -c "import sys, json; print(json.load(sys.stdin)['capSignal']['score'])")

if [ "$CUR_SCORE" != "$PREV_SCORE" ]; then
    echo "⚠️ Signal changed: $PREV_SCORE → $CUR_SCORE" | termux-notification -t "CCE Signal Update"
    echo $CUR_SCORE > ~/cce/score_history.txt
fi
