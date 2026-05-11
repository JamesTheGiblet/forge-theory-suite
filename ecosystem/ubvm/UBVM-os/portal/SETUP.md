# UBVM Portal — Setup Guide

## Directory structure on your VPS

```
/root/ubvm/
├── core/
│   └── thaumiel.scp.json        ← your sovereign capsule (never share)
├── nodes/
│   └── incybe/                  ← Abe's approved modules land here
└── portal/
    ├── server.js
    ├── package.json
    ├── ecosystem.config.js
    ├── scp.json
    ├── queue/                   ← auto-created on first run
    │   └── queue.json
    ├── logs/                    ← create this
    └── public/
        ├── index.html
        └── login.html
```

## 1. Upload files to VPS

```bash
# On your VPS
mkdir -p /root/ubvm/portal/public
mkdir -p /root/ubvm/portal/logs
mkdir -p /root/ubvm/nodes/incybe
```

Copy all portal files into `/root/ubvm/portal/`

## 2. Install dependencies

```bash
cd /root/ubvm/portal
npm install
```

## 3. Set your passwords

Edit `ecosystem.config.js` and change:
- `JAMES_PASSWORD` — your password
- `ABE_PASSWORD` — Abe's password
- `SESSION_SECRET` — any long random string (generate with: `openssl rand -hex 32`)

**Never commit these values to git.**

## 4. Start with PM2

```bash
cd /root/ubvm/portal
pm2 start ecosystem.config.js
pm2 save
```

## 5. Nginx reverse proxy (so Abe hits a clean URL)

Add to your nginx config:

```nginx
location /ubvm/ {
    proxy_pass http://localhost:3020/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Then reload nginx:
```bash
nginx -s reload
```

Abe's URL becomes: `https://your-vps-domain/ubvm/`

Or if you want it on a subdomain (`portal.yourdomain.com`):

```nginx
server {
    listen 443 ssl;
    server_name portal.yourdomain.com;

    location / {
        proxy_pass http://localhost:3020;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 6. Tell Abe

Send Abe:
- The URL
- His password
- The scp.json template (visible in the portal itself under Submit)

That's it. He logs in, fills in his scp.json, uploads it, hits Submit. You get a new entry in the Review Queue, approve it, it lands in `/root/ubvm/nodes/incybe/` and PM2 picks it up.

## Workflow summary

```
Abe → portal → submits scp.json + optional primitive.js
James → portal → Review Queue → Approve
Portal injects granted_by: "james" into scp.json
Module written to /root/ubvm/nodes/incybe/module-name/
UBVM watcher detects new capsule → PM2 starts process
```

## PM2 commands

```bash
pm2 status              # check portal is running
pm2 logs ubvm-portal    # tail logs
pm2 restart ubvm-portal # restart after config change
```
