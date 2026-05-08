#!/bin/bash
BACKUP_DIR=~/legion/backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cd ~/legion
cp -r strategies/active $BACKUP_DIR/
cp data/*.json $BACKUP_DIR/
echo "✅ Backup saved to $BACKUP_DIR"
