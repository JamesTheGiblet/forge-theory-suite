# Safety System — 4 Locks to Live Trading

## Overview
Pharaoh has 4 independent safety locks. **All 4 must be disengaged** to enable live trading.

## Lock 1: SAFETY_LOCK File
A physical file that must be deleted.

```bash
# Location
~/pharaoh-engine/SAFETY_LOCK

# Check status
ls -la ~/pharaoh-engine/SAFETY_LOCK

# Disengage (delete)
rm ~/pharaoh-engine/SAFETY_LOCK

# Re-engage (recreate)
echo "LOCKED" > ~/pharaoh-engine/SAFETY_LOCK
```

Lock 2: .LIVE Flag File

A hidden file that must exist.

```bash
# Location
~/pharaoh-engine/.LIVE

# Check status
ls -la ~/pharaoh-engine/.LIVE

# Disengage (create)
touch ~/pharaoh-engine/.LIVE

# Re-engage (delete)
rm ~/pharaoh-engine/.LIVE
```

Lock 3: LIVE Environment Variable

Must be set to "true".

```bash
# Check status
echo $LIVE

# Disengage (set)
export LIVE=true

# For PM2
pm2 restart pharaoh --update-env
LIVE=true pm2 restart pharaoh

# Re-engage
unset LIVE
```

Lock 4: Manual Confirmation

Must type exact phrase when prompted.

```
I UNDERSTAND THE RISK
```

Going Live — All 4 Steps

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

Current Status Check

```bash
# Quick safety status
echo "SAFETY_LOCK: $(test -f ~/pharaoh-engine/SAFETY_LOCK && echo '🔒 EXISTS' || echo '✅ REMOVED')"
echo ".LIVE: $(test -f ~/pharaoh-engine/.LIVE && echo '✅ EXISTS' || echo '🔒 MISSING')"
echo "LIVE env: $(test "$LIVE" = "true" && echo '✅ SET' || echo '🔒 NOT SET')"
```

Dry Run Mode (Default)

When any lock is engaged, Pharaoh runs in DRY RUN mode — no real trades, no API calls to Kraken for orders.
