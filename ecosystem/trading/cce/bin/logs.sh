#!/data/data/com.termux/files/usr/bin/bash

case "$1" in
    all|"")
        tail -f ~/cce/logs/monitor.log
        ;;
    errors)
        tail -f ~/cce/logs/errors.log 2>/dev/null || echo "No errors yet"
        ;;
    signal)
        tail -f ~/cce/cache/signals.log 2>/dev/null || echo "No signal history yet"
        ;;
    last)
        tail -20 ~/cce/logs/monitor.log
        ;;
    *)
        echo "Usage: ./logs.sh {all|errors|signal|last}"
        ;;
esac
