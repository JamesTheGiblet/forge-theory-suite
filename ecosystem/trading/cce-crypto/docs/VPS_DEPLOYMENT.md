# VPS Deployment
### CCE Platform — Multi-Client Server Architecture

**Status:** 🟢 Live — Helsinki, Finland
**Provider:** Hetzner Cloud
**Server:** ubuntu-4gb-hel1-1
**IP:** 65.21.244.131
**Dashboard:** http://65.21.244.131
**SSH Alias:** `ssh cce-vps`

---

## Overview

CCE runs on a Hetzner VPS in Helsinki, accessible from any phone anywhere in the world. Each client gets their own CCE instance, their own dashboard URL, and their own Telegram feed — without needing to install anything on their own device.

---

## Server Specs

| Detail | Value |
|--------|-------|
| Provider | Hetzner Cloud |
| Plan | CX22 (2 vCPU, 4GB RAM) |
| OS | Ubuntu 24.04 LTS |
| Location | Helsinki 1, Finland |
| IPv4 | 65.21.244.131 |
| IPv6 | 2a01:4f9:c014:49af::1 |
| Cost | ~£3.79/month |
| Node.js | v22.22.2 |
| PM2 | v6.0.14 |
| nginx | 1.24.0 |

---

## SSH Access

```bash
# From S24 Termux — no password needed
ssh cce-vps

# SSH config (~/.ssh/config)
Host cce-vps
    HostName 65.21.244.131
    User root
    IdentityFile ~/.ssh/cce_vps

# Direct connection
ssh -i ~/.ssh/cce_vps root@65.21.244.131
Directory Structure
/home/cce/
├── clients/
│   ├── james/          — James personal instance (LIVE)
│   └── [client-name]/  — Future client instances
└── control/            — CCE Control (planned)

/root/.pm2/             — PM2 process manager
/etc/nginx/             — nginx reverse proxy
Running Processes
ssh cce-vps pm2 ls
Name
Port
Description
james-cce
—
CCE bot — 13 engines
james-dash
3000
James dashboard
Dashboard Access
URL
Description
http://65.21.244.131
James dashboard (via nginx)
http://65.21.244.131:3000
James dashboard (direct)
Deploying a New Client
From S24 Termux:
cd ~/cce-crypto

# Deploy CCE files to VPS
bash bin/cce-deploy-vps.sh <client-name>

# SSH into VPS
ssh cce-vps

# Configure client environment
nano /home/cce/clients/<client-name>/.env

# Start client instance
cd /home/cce/clients/<client-name>
pm2 start index.js --name <client>-cce
pm2 start dashboard-server.js --name <client>-dash
pm2 save
Client .env Template
KRAKEN_API_KEY=their_trade_key
KRAKEN_API_SECRET=their_trade_secret
TELEGRAM_BOT_TOKEN=shared_bot_token
TELEGRAM_CHAT_ID=their_chat_id
CCE_DRY_RUN=true
STARTING_CAPITAL=1000
CLIENT_NAME=Abe
WEATHER_API_KEY=shared_key
FRED_API_KEY=shared_key
nginx Configuration
Each client gets proxied from port 80:
# /etc/nginx/sites-available/cce
server {
    listen 80;
    server_name 65.21.244.131;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
For multiple clients, each gets their own port:
# James — port 3000 → http://65.21.244.131
# Abe   — port 3001 → http://65.21.244.131:3001
# Mark  — port 3002 → http://65.21.244.131:3002
Reload nginx after changes:
nginx -t && systemctl restart nginx
Common VPS Commands
# Connect
ssh cce-vps

# Check all processes
ssh cce-vps pm2 ls

# Check logs
ssh cce-vps pm2 logs james-cce --lines 20
ssh cce-vps pm2 logs james-dash --lines 10

# Restart a process
ssh cce-vps pm2 restart james-cce

# Restart all
ssh cce-vps pm2 restart all

# Check server resources
ssh cce-vps htop

# Check disk space
ssh cce-vps df -h

# Check memory
ssh cce-vps free -h
Deploying Updates
When CCE is updated on S24, push to VPS:
cd ~/cce-crypto
bash bin/cce-deploy-vps.sh james
ssh cce-vps pm2 restart james-cce james-dash
Client Onboarding Process
Client pays £200 setup fee
Client creates Kraken account at kraken.com
Client generates API key — Trade only, no withdrawal
Client sends key + secret to James (WhatsApp)
James runs: bash bin/cce-deploy-vps.sh <name>
James configures .env with client's keys
James starts client's PM2 processes
Client receives Telegram welcome message
Client accesses dashboard at http://65.21.244.131:<port>
James adds client to CCE Control (localhost:3002)
Revenue vs Cost
Clients
Setup Fees
Monthly Siphon
VPS Cost
Net
1 (James)
£0
£0
£3.79
-£3.79
3 (+ Abe + Mark)
£400
£30
£3.79
£426
10 clients
£1,800
£100
£3.79
£1,896
VPS pays for itself with the first client setup fee.
Security
SSH key authentication only (password disabled)
Each client's API keys in their own .env — no cross-client access
Kraken keys are trade-only — withdrawal impossible via API
Hetzner firewall: only ports 22, 80, 443 open
SSL via Let's Encrypt (planned — when domain is added)
Planned Improvements
[ ] Domain name (e.g. cce.gibletscreations.com)
[ ] SSL/HTTPS via Let's Encrypt
[ ] Subdomain per client (abe.cce.gibletscreations.com)
[ ] cce-deploy new-client one-command onboarding
[ ] CCE Control deployed on VPS
[ ] Automated backup of client databases
[ ] Monitoring alerts if any client process goes down
Current Clients on VPS
Client
Port
Status
Since
James (Personal)
3000
🟢 Live
30 March 2026
Giblets Creations · v1.0 · March 2026
"I wanted it. So I forged it. Now forge yours."
