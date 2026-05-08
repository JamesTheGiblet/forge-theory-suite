#!/bin/bash
VPS_IP="65.21.244.131"
VPS_USER="root"
SSH_KEY="~/.ssh/cce_vps"
CLIENT=$1

if [ -z "$CLIENT" ]; then
  echo "Usage: cce-deploy-vps.sh <client-name>"
  exit 1
fi

echo "🚀 Deploying CCE for client: $CLIENT"

# Create client directory on VPS
ssh -i $SSH_KEY $VPS_USER@$VPS_IP "mkdir -p /home/cce/clients/$CLIENT"

# Sync CCE files (exclude sensitive files and heavy folders)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'data/*.db' \
  --exclude '_backups' \
  --exclude '.git' \
  -e "ssh -i $SSH_KEY" \
  ~/cce-crypto/ \
  $VPS_USER@$VPS_IP:/home/cce/clients/$CLIENT/

echo "✅ Files synced"
echo "📦 Installing dependencies..."

ssh -i $SSH_KEY $VPS_USER@$VPS_IP "cd /home/cce/clients/$CLIENT && npm install --production"

echo "✅ Done — $CLIENT deployed to VPS"
