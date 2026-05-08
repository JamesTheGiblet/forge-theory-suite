#!/bin/sh

ORG="Forge-Theory-Labs"
FILE="descriptions.txt"

echo "=== Forge Theory Labs — Batch Description Engine ==="
echo ""

while IFS=";" read -r REPO DESC; do
    [ -z "$REPO" ] && continue

    echo "→ Setting description for $REPO ..."
    RESULT=$(gh repo edit "$ORG/$REPO" --description "$DESC" 2>&1)

    if [ $? -eq 0 ]; then
        echo "   ✔ Updated: $DESC"
    else
        echo "   ✖ Failed: $RESULT"
    fi

    echo ""
done < "$FILE"

echo "=== Complete ==="
