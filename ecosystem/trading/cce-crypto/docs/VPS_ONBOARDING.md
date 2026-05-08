# CCE Client Onboarding Guide
### Step-by-step — From new client to live dashboard

**For:** James (Operator)
**Time:** ~30 minutes per client
**Result:** Client has live CCE dashboard accessible from their phone

---

## Before You Start

You need:
- [ ] Signed service agreement (see `docs/CCE_CONTROL.md`)
- [ ] £200 setup fee received
- [ ] Client's Kraken API key and secret
- [ ] Client's Telegram chat ID
- [ ] Client's starting capital amount

---

## PART 1 — CLIENT SETUP (They do this)

Send this to your client:

---

*"Hey [name], to get you set up on CCE I need you to do three quick things:*

*1. Create a Kraken account at kraken.com if you don't have one*
*2. Deposit your starting capital*
*3. Generate an API key — I'll walk you through it below"*

---

### How to Create a Kraken API Key

Tell your client:

1. Log into **kraken.com**
2. Go to **Security → API**
3. Click **+ Add key**
4. Name it: `CCE Trading`
5. Under **Funds permissions** tick: ✅ **Query** and ✅ **Create & modify orders**
6. Under **Orders and trades** tick: ✅ **Query open orders & trades**
7. Leave everything else OFF — especially **Withdraw**
8. Click **Generate key**
9. **Copy both the Key and the Secret immediately** — the secret is only shown once
10. Send them to James via WhatsApp

---

### How to Get Their Telegram Chat ID

Tell your client:

1. Open Telegram
2. Search for **@userinfobot**
3. Send it any message
4. It replies with your Chat ID — send that number to James

---

## PART 2 — OPERATOR SETUP (You do this)

Once you have their API key, secret, and Telegram chat ID:

### Step 1 — Deploy CCE to VPS

On your S24 in Termux:

```bash
cd ~/cce-crypto
bash bin/cce-deploy-vps.sh <client-name>
Example for Abe:
bash bin/cce-deploy-vps.sh abe
Wait for: ✅ Done — abe deployed to VPS
Step 2 — Configure Client Environment
ssh cce-vps
nano /home/cce/clients/abe/.env
Fill in their details:
# Exchange
KRAKEN_API_KEY=their_api_key_here
KRAKEN_API_SECRET=their_api_secret_here

# Notifications
TELEGRAM_BOT_TOKEN=your_shared_bot_token
TELEGRAM_CHAT_ID=their_telegram_chat_id

# Trading
CCE_DRY_RUN=true
STARTING_CAPITAL=1000
BASE_CURRENCY=USD
CLIENT_NAME=Abe

# Data feeds (use your shared keys)
WEATHER_API_KEY=your_weather_key
FRED_API_KEY=your_fred_key
LICENCE_KEY=DEV
Save with Ctrl+X → Y → Enter
Step 3 — Assign Client Port
Each client needs their own port:
Client
Port
Dashboard URL
James
3000
http://65.21.244.131
Abe
3001
http://65.21.244.131:3001
Mark
3002
http://65.21.244.131:3002
Client 4
3003
http://65.21.244.131:3003
Edit the dashboard port for their instance:
# Check current port in dashboard-server.js
grep "PORT\|port\|listen" /home/cce/clients/abe/dashboard-server.js | head -5

# Change port to 3001 for Abe
sed -i 's/const PORT = 3000/const PORT = 3001/' /home/cce/clients/abe/dashboard-server.js
Step 4 — Start Client Processes
cd /home/cce/clients/abe
pm2 start index.js --name abe-cce
pm2 start dashboard-server.js --name abe-dash
pm2 save
pm2 ls
You should see:
james-cce    online
james-dash   online
abe-cce      online
abe-dash     online
Step 5 — Open Port in Firewall
ufw allow 3001
ufw status
Step 6 — Verify It's Working
# Check logs — should show engines starting
pm2 logs abe-cce --lines 20

# Check dashboard responds
curl -s http://localhost:3001/api/health
Should return: {"status":"online"}
Step 7 — Send Client Their Details
Message them:
"You're live on CCE! 🎉
Your dashboard: http://65.21.244.131:3001
Bookmark this on your phone.
The engine is in DRY RUN mode — it's watching the market but not trading yet.
I'll switch it to live trading once we've both watched it run for a few days.
You'll get Telegram notifications for:
- State changes (DORMANT → WATCHING → ACTIVE)
- Trade signals
- Monthly performance report
Current market: Fear & Greed is [X] — engine is DORMANT. This is correct.
It's waiting for the right conditions.
Any questions just message me."
Step 8 — Add to CCE Control
On your S24:
Open localhost:3002
Tap + Add Client
Fill in their details
Tick Setup fee paid
Add their Kraken read-only key (optional — for live balance)
Step 9 — Switch to Live Trading
After 7+ days of successful dry run:
ssh cce-vps
nano /home/cce/clients/abe/.env
# Change: CCE_DRY_RUN=true → CCE_DRY_RUN=false
pm2 restart abe-cce
Confirm with client before doing this.
PART 3 — ONGOING MANAGEMENT
Check All Clients
ssh cce-vps pm2 ls
Check Specific Client Logs
ssh cce-vps pm2 logs abe-cce --lines 20
Restart a Client
ssh cce-vps pm2 restart abe-cce abe-dash
Push CCE Update to All Clients
cd ~/cce-crypto
bash bin/cce-deploy-vps.sh james
bash bin/cce-deploy-vps.sh abe
bash bin/cce-deploy-vps.sh mark
ssh cce-vps pm2 restart all
Monthly Siphon Check
Open CCE Control (localhost:3002)
Check Siphon column for each client
Transfer siphon amount from CSS reserve to your account
TROUBLESHOOTING
Client dashboard not loading
ssh cce-vps pm2 ls          # Check process is online
ssh cce-vps pm2 restart abe-dash
ufw allow 3001               # Check port is open
Engine not cycling
ssh cce-vps pm2 logs abe-cce --lines 50  # Check for errors
# Common cause: bad API key in .env
Telegram not sending
# Check bot token and chat ID in .env
ssh cce-vps cat /home/cce/clients/abe/.env | grep TELEGRAM
Client locked out of dashboard
# Just send them the URL again
# http://65.21.244.131:<their-port>
QUICK REFERENCE
# Connect to VPS
ssh cce-vps

# Deploy new client
bash bin/cce-deploy-vps.sh <name>

# Check all processes
ssh cce-vps pm2 ls

# View client logs
ssh cce-vps pm2 logs <name>-cce --lines 20

# Restart client
ssh cce-vps pm2 restart <name>-cce

# Open firewall port
ssh cce-vps ufw allow <port>
CLIENT PORT REGISTRY
Client
Port
Status
Since
James
3000
🟢 Live
30 Mar 2026
Abe
3001
⏳ Pending
-
Mark
3002
⏳ Pending
-
Giblets Creations · v1.0 · March 2026
"I wanted it. So I forged it. Now forge yours."
