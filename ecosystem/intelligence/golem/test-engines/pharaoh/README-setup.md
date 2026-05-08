# Setup & Configuration

## Installation

```bash
# Create directory
mkdir -p ~/pharaoh-engine
cd ~/pharaoh-engine

# Install dependencies
npm install
```

Dependencies

Package Purpose
ccxt Kraken exchange API
dotenv Environment variables
sql.js SQLite for data storage (optional)

Environment Variables (.env)

```bash
# Create .env file
nano ~/pharaoh-engine/.env
```

Required

```env
# Kraken API keys (trading permissions only, NO withdrawal)
KRAKEN_API_KEY=your_api_key_here
KRAKEN_API_SECRET=your_api_secret_here
```

Optional

```env
# Telegram notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Kraken API Key Setup

1. Log into Kraken
2. Security → API → Generate new key
3. Permissions: Trade only (NO withdrawals)
4. IP restriction: Add your phone's IP (optional)
5. Copy key and secret to .env

Running with PM2 (Recommended)

```bash
# Start
pm2 start pharaoh.js --name pharaoh

# Save to auto-start on boot
pm2 save
pm2 startup

# View status
pm2 list

# View logs
pm2 logs pharaoh

# Restart
pm2 restart pharaoh

# Stop
pm2 stop pharaoh

# Delete
pm2 delete pharaoh
```

Running Directly

```bash
# Dry run
node pharaoh.js

# Live (with safety locks)
LIVE=true node pharaoh.js
```

File Permissions

```bash
# Make .env readable only by owner
chmod 600 ~/pharaoh-engine/.env

# Make pharaoh.js executable
chmod +x ~/pharaoh-engine/pharaoh.js
```

First Run Check

```bash
# Start in dry run
pm2 start pharaoh.js --name pharaoh

# Wait 30 seconds, then check
pm2 logs pharaoh --lines 20 --nostream

# Should see:
# - "Kraken exchange initialised"
# - "Mode: 🔵 DRY RUN"
# - No API errors
```

