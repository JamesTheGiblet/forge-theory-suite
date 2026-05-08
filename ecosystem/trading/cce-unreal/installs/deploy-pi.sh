#!/bin/bash
# setup-pi.sh
# Raspberry Pi setup script for CCE Production

set -e  # Exit on error

echo "================================================"
echo "CCE Production - Raspberry Pi Setup"
echo "================================================"
echo ""

# Update system
echo "1. Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
echo "2. Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
echo "   Node version: $(node --version)"
echo "   NPM version: $(npm --version)"

# Install system dependencies
echo "3. Installing system dependencies..."
sudo apt install -y git sqlite3 build-essential

# Create project directory
echo "4. Setting up project directory..."
if [ -f "package.json" ]; then
    echo "   ✅ Running in current directory: $(pwd)"
else
    echo "   📂 Creating ~/cce-production..."
    mkdir -p ~/cce-production
    cd ~/cce-production
fi

# Copy files (assumes you've transferred them)
echo "5. Installing NPM packages..."
npm install

# Create required directories
echo "6. Creating data and log directories..."
mkdir -p data logs

# Set up environment
if [ ! -f .env ]; then
    echo "7. Creating .env file from template..."
    cp .env.example .env
    echo "   ⚠️  IMPORTANT: Edit .env and add your API keys"
    echo "   Run: nano .env"
else
    echo "7. .env file already exists"
fi

# Install PM2 and Start
echo "8. Installing PM2 and starting processes..."
sudo npm install -g pm2

# Start processes
pm2 start index.js --name cce-bot
pm2 start dashboard-server.js --name cce-dashboard
pm2 save

# Setup Auto-Startup
echo "   Setting up auto-start..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp $HOME

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano .env"
echo "2. Add your Kraken API keys"
echo "3. Test in dry run: npm run dry-run"
echo "4. View logs: pm2 logs"
echo "5. Dashboard: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "⚠️  Remember: Start in DRY RUN mode and test for 30+ days!"
echo ""
