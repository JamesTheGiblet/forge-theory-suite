#!/bin/sh

ORG="Forge-Theory-Labs"
MANIFEST="scp-manifest.txt"
CAPSULE_DIR="scp-capsules"

echo "=== Forge Theory Labs — SCP Deployment Engine ==="
echo ""

while IFS= read -r REPO; do
    [ -z "$REPO" ] && continue

    CAPSULE_FILE="$CAPSULE_DIR/$REPO.md"

    if [ ! -f "$CAPSULE_FILE" ]; then
        echo "✖ Missing capsule for $REPO — skipping"
        echo ""
        continue
    fi

    echo "→ Deploying SCP capsule to $REPO ..."

    # Clone repo
    gh repo clone "$ORG/$REPO" tmp-"$REPO" >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "   ✖ Failed to clone $REPO"
        echo ""
        continue
    fi

    cd tmp-"$REPO"

    # Write capsule
    cp "../$CAPSULE_FILE" SCP.md

    # Commit + push
    git add SCP.md
    git commit -m "Add SCP capsule" >/dev/null 2>&1
    git push >/dev/null 2>&1

    cd ..
    rm -rf tmp-"$REPO"

    echo "   ✔ SCP capsule deployed"
    echo ""

done < "$MANIFEST"

echo "=== Complete ==="
