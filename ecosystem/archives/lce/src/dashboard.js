// src/dashboard.js — LCE Express Dashboard (port 3004)

const express = require('express');
const config = require('../config');

class Dashboard {
  constructor(engine) {
    this.engine = engine;
    this.app = express();
  }

  start() {
    this.app.get('/status', (req, res) => {
      res.json(this.engine.getStatus());
    });

    this.app.get('/', (req, res) => {
      const status = this.engine.getStatus();
      const stateColor = {
        DORMANT: '#888', STALKING: '#f0a500',
        TRIGGERED: '#ff6b00', RIDING: '#00e676', EXITING: '#ef5350',
      }[status.state] || '#888';

      res.send(`<!DOCTYPE html>
<html>
<head>
  <title>LCE — Liquidation Cascade Engine</title>
  <meta http-equiv="refresh" content="30">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #e0e0e0; font-family: 'Share Tech Mono', monospace; padding: 20px; }
    .header { border-bottom: 1px solid #ff6b00; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { color: #ff6b00; font-size: 1.4em; letter-spacing: 3px; }
    .header p { color: #666; font-size: 0.75em; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 4px; padding: 14px; }
    .card label { color: #555; font-size: 0.7em; letter-spacing: 2px; text-transform: uppercase; }
    .card .value { font-size: 1.6em; margin-top: 6px; font-weight: bold; }
    .state-badge { display: inline-block; padding: 4px 12px; border-radius: 2px; font-size: 0.9em; font-weight: bold; }
    .trades { background: #12121a; border: 1px solid #1e1e2e; border-radius: 4px; padding: 14px; }
    .trades h3 { color: #ff6b00; font-size: 0.8em; letter-spacing: 2px; margin-bottom: 12px; }
    .trade-row { display: flex; justify-content: space-between; font-size: 0.75em; padding: 6px 0; border-bottom: 1px solid #1a1a2e; }
    .win { color: #00e676; }
    .loss { color: #ef5350; }
    .mode { background: ${config.engine.dryRun ? '#1a2a1a' : '#2a1a1a'}; border: 1px solid ${config.engine.dryRun ? '#00e676' : '#ef5350'}; color: ${config.engine.dryRun ? '#00e676' : '#ef5350'}; padding: 6px 14px; font-size: 0.7em; letter-spacing: 2px; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ LIQUIDATION CASCADE ENGINE</h1>
    <p>v${config.engine.version} · ${new Date().toLocaleString()} · <span class="mode">${config.engine.dryRun ? 'DRY RUN' : 'LIVE'}</span></p>
  </div>

  <div class="grid">
    <div class="card">
      <label>State</label>
      <div class="value"><span class="state-badge" style="color:${stateColor};border:1px solid ${stateColor}">${status.state}</span></div>
    </div>
    <div class="card">
      <label>Daily PnL</label>
      <div class="value ${status.dailyPnlPct >= 0 ? 'win' : 'loss'}">${status.dailyPnlPct >= 0 ? '+' : ''}${status.dailyPnlPct.toFixed(2)}%</div>
    </div>
    <div class="card">
      <label>Daily Trades</label>
      <div class="value">${status.dailyTrades}</div>
    </div>
    <div class="card">
      <label>Total Trades</label>
      <div class="value">${status.stats?.totalTrades || 0}</div>
    </div>
    <div class="card">
      <label>Win Rate</label>
      <div class="value">${status.stats?.winRate || '—'}%</div>
    </div>
    <div class="card">
      <label>Avg PnL/Trade</label>
      <div class="value">${status.stats?.avgPnl || '—'}%</div>
    </div>
  </div>

  ${status.activePosition ? `
  <div class="trades" style="border-color:#ff6b00;margin-bottom:12px">
    <h3>🎯 ACTIVE POSITION</h3>
    <div class="trade-row">
      <span>${status.activePosition.symbol}</span>
      <span>${status.activePosition.side}</span>
      <span>Entry: $${status.activePosition.entryPrice.toFixed(2)}</span>
      <span>SL: $${status.activePosition.stopLoss.toFixed(2)}</span>
      <span>TP: $${status.activePosition.takeProfit.toFixed(2)}</span>
    </div>
  </div>` : ''}

  <div class="trades">
    <h3>📋 RECENT TRADES</h3>
    ${(status.recentTrades || []).length === 0
      ? '<div style="color:#555;font-size:0.75em">No trades yet</div>'
      : (status.recentTrades || []).map(t => `
      <div class="trade-row">
        <span>${t.symbol || t.symbol}</span>
        <span>${t.side || t.side}</span>
        <span>$${(t.entry_price || t.entryPrice || 0).toFixed(2)}</span>
        <span class="${(t.pnl_pct || t.pnlPct || 0) >= 0 ? 'win' : 'loss'}">${(t.pnl_pct || t.pnlPct || 0) >= 0 ? '+' : ''}${(t.pnl_pct || t.pnlPct || 0).toFixed(2)}%</span>
        <span style="color:#555">${t.reason || t.reason}</span>
      </div>`).join('')}
  </div>
</body>
</html>`);
    });

    this.app.listen(config.dashboard.port, () => {
      console.log(`[LCE] 📊 Dashboard: http://localhost:${config.dashboard.port}`);
    });
  }
}

module.exports = Dashboard;
