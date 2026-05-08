// cce-control-server.js
// CCE Control — Master Client Management Dashboard
// Port 3002 — sits above all deployed CCE instances

'use strict';

require('dotenv').config();
const express = require('express');
const path    = require('path');
const https   = require('https');
const fs      = require('fs');

const app  = express();
const PORT = 3002;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public/control')));

// ── CLIENT REGISTRY ───────────────────────────────────────────────────────────
// In production this would be a database — for now a JSON file
const CLIENTS_FILE = path.join(__dirname, 'data', 'cce-clients.json');

function loadClients() {
  if (!fs.existsSync(CLIENTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8')); }
  catch(e) { return []; }
}

function saveClients(clients) {
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
}

// ── FETCH CLIENT BALANCE VIA CCE DASHBOARD ──────────────────────────────────
async function fetchClientBalance(client) {
  try {
    // For personal account — read from CCE dashboard API (avoids nonce conflicts)
    if (client.id === 'personal') {
      const http = require('http');
      const result = await new Promise((resolve) => {
        http.get('http://localhost:3000/api/portfolio', res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try { resolve(JSON.parse(d)); }
            catch(e) { resolve(null); }
          });
        }).on('error', () => resolve(null));
      });
      if (result && result.totalUSD) {
        return { total: +parseFloat(result.totalUSD).toFixed(2), assets: result.assets || [] };
      }
    }

    // For client accounts with their own read keys
    if (client.krakenReadKey && client.krakenReadSecret) {
      const ccxt   = require('ccxt');
      const exchange = new ccxt.kraken({
        apiKey: client.krakenReadKey,
        secret: client.krakenReadSecret
      });
      const balance = await exchange.fetchBalance();
      let total = 0;
      for (const [asset, val] of Object.entries(balance.total || {})) {
        const v = parseFloat(val) || 0;
        if (['USDC','USD','ZUSD'].includes(asset)) total += v;
        if (['BTC','XBT','XXBT'].includes(asset)) total += v * 67000;
        if (['ETH','XETH'].includes(asset)) total += v * 2000;
        if (['SOL'].includes(asset)) total += v * 85;
      }
      return { total: +total.toFixed(2), assets: [] };
    }

    // Fallback — return starting capital
    return { total: client.startingCapital || 0, assets: [] };
  } catch(e) {
    return { error: e.message, total: client.startingCapital || 0 };
  }
}

// ── SIPHON TOTAL ──────────────────────────────────────────────────────────────
function getSiphonTotal(clientId) {
  // Read from CSS database for this client
  try {
    const initSqlJs = require('sql.js');
    const dbPath = path.join(__dirname, 'data', 'css-production.db');
    if (!fs.existsSync(dbPath)) return 0;
    // Sync read for simplicity
    return 0; // TODO: filter by client_id once multi-client CSS is built
  } catch(e) { return 0; }
}

// ── API ENDPOINTS ─────────────────────────────────────────────────────────────

// Get all clients summary
app.get('/api/control/clients', async (req, res) => {
  const clients = loadClients();
  const summary = await Promise.all(clients.map(async c => {
    const balance = c.krakenReadKey
      ? await fetchClientBalance(c)
      : { total: c.startingCapital, assets: [] };

    const returnPct = c.startingCapital > 0
      ? +((balance.total - c.startingCapital) / c.startingCapital * 100).toFixed(1)
      : 0;

    return {
      id:              c.id,
      name:            c.name,
      startingCapital: c.startingCapital,
      currentValue:    balance.total,
      returnPct,
      setupFeePaid:    c.setupFeePaid || false,
      setupFeeAmount:  c.setupFeeAmount !== undefined ? c.setupFeeAmount : 200,
      siphonTotal:     c.siphonTotal || 0,
      engineState:     c.engineState || 'DORMANT',
      joinDate:        c.joinDate,
      lastUpdated:     new Date().toISOString(),
      error:           balance.error || null
    };
  }));

  const totalAUM      = summary.reduce((a, c) => a + c.currentValue, 0);
  const totalSetup    = summary.filter(c => c.setupFeePaid).reduce((a, c) => a + c.setupFeeAmount, 0);
  const totalSiphon   = summary.reduce((a, c) => a + c.siphonTotal, 0);
  const totalEarned   = totalSetup + totalSiphon;

  res.json({ clients: summary, totals: { totalAUM, totalSetup, totalSiphon, totalEarned, clientCount: summary.length } });
});

// Add a client
app.post('/api/control/clients', (req, res) => {
  const clients = loadClients();
  const client = {
    id:              Date.now().toString(),
    name:            req.body.name,
    startingCapital: req.body.startingCapital || 0,
    krakenReadKey:   req.body.krakenReadKey || '',
    krakenReadSecret: req.body.krakenReadSecret || '',
    setupFeePaid:    req.body.setupFeePaid || false,
    setupFeeAmount:  req.body.setupFeeAmount || 200,
    siphonTotal:     0,
    engineState:     'DORMANT',
    joinDate:        new Date().toISOString(),
    notes:           req.body.notes || ''
  };
  clients.push(client);
  saveClients(clients);
  res.json({ success: true, client });
});

// Update a client
app.put('/api/control/clients/:id', (req, res) => {
  const clients = loadClients();
  const idx = clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Client not found' });
  clients[idx] = { ...clients[idx], ...req.body };
  saveClients(clients);
  res.json({ success: true, client: clients[idx] });
});

// Delete a client
app.delete('/api/control/clients/:id', (req, res) => {
  const clients = loadClients().filter(c => c.id !== req.params.id);
  saveClients(clients);
  res.json({ success: true });
});

// Revenue summary
app.get('/api/control/revenue', (req, res) => {
  const clients = loadClients();
  const setupFees  = clients.filter(c => c.setupFeePaid).reduce((a, c) => a + (c.setupFeeAmount || 200), 0);
  const siphonTotal = clients.reduce((a, c) => a + (c.siphonTotal || 0), 0);
  res.json({
    setupFees,
    siphonTotal,
    total: setupFees + siphonTotal,
    clientCount: clients.length,
    paidCount: clients.filter(c => c.setupFeePaid).length
  });
});

// Health
app.get('/api/control/health', (req, res) => {
  res.json({ status: 'online', port: PORT, timestamp: new Date().toISOString() });
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/control/index.html'));
});

// ── AUTO-SEED PERSONAL ACCOUNT ───────────────────────────────────────────────
function seedPersonalAccount() {
  const clients = loadClients();
  const exists = clients.find(c => c.id === 'personal');
  if (!exists && process.env.KRAKEN_READ_KEY) {
    clients.unshift({
      id:               'personal',
      name:             'James (Personal)',
      startingCapital:  375,
      krakenReadKey:    process.env.KRAKEN_READ_KEY,
      krakenReadSecret: process.env.KRAKEN_READ_SECRET,
      setupFeePaid:     true,
      setupFeeAmount:   0,
      siphonTotal:      0,
      engineState:      'DORMANT',
      joinDate:         '2026-03-13T00:00:00.000Z',
      notes:            'Personal account — CCE live trading'
    });
    saveClients(clients);
    console.log('[CCE CONTROL] ✅ Personal account seeded from .env');
  } else if (exists && process.env.KRAKEN_READ_KEY) {
    // Always keep read keys fresh from env
    exists.krakenReadKey    = process.env.KRAKEN_READ_KEY;
    exists.krakenReadSecret = process.env.KRAKEN_READ_SECRET;
    saveClients(clients);
  }
}

app.listen(PORT, () => {
  console.log(`\n[CCE CONTROL] ✅ Running on port ${PORT}`);
  console.log(`[CCE CONTROL] 📊 Dashboard: http://localhost:${PORT}\n`);
  seedPersonalAccount();
});
