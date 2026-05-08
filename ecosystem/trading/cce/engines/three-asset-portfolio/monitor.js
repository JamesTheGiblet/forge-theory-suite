/**
 * Adaptive Intelligence Platform — Monitor
 * Part of the AIP suite
 * License: MIT
 */

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.env.HOME, 'kraken-intelligence/data/intelligence.db');
const STATE_FILE = path.join(__dirname, 'portfolio_state.json');

class ThreeAssetMonitor {
  constructor() {
    this.db = null;
    this.assets = ['LINK/USD', 'BTC/USD', 'LTC/USD'];
    this.allocations = { 'LINK/USD': 0.40, 'BTC/USD': 0.40, 'LTC/USD': 0.20 };
    this.totalCapital = 250;
    this.positions = {};
    this.consecutiveRed = {};
    this.trades = [];
    this.lastProcessedIndices = {};
    this.params = {
      targetPct: 1,
      stopPct: 0.75,
      maxHoldDays: 5,
      requiredRed: 4,
      maxConcurrent: 2
    };
    this.loadState();
  }

  loadState() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        this.positions = state.positions || {};
        this.trades = state.trades || [];
        this.lastProcessedIndices = state.lastProcessedIndices || {};
        console.log(`📂 Loaded state: ${this.trades.length} trades`);
      } catch (e) {
        console.log('📂 No valid state, starting fresh');
      }
    }
  }

  saveState() {
    const state = {
      positions: this.positions,
      trades: this.trades,
      lastProcessedIndices: this.lastProcessedIndices,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  async initDB() {
    const SQL = await initSqlJs();
    const dbBuffer = fs.readFileSync(DB_PATH);
    this.db = new SQL.Database(dbBuffer);
  }

  getCandles(asset) {
    const result = this.db.exec(
      `SELECT timestamp, open, high, low, close, volume
       FROM candles
       WHERE pair = ? AND interval = '1D'
       ORDER BY timestamp ASC`,
      [asset]
    );
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((row, idx) => {
      const candle = {};
      columns.forEach((col, i) => candle[col] = row[i]);
      candle.index = idx;
      return candle;
    });
  }

  getActivePositionsCount() {
    return Object.values(this.positions).filter(p => p !== null).length;
  }

  processCandle(asset, candle) {
    // Track consecutive red
    if (candle.close < candle.open) {
      this.consecutiveRed[asset] = (this.consecutiveRed[asset] || 0) + 1;
    } else {
      this.consecutiveRed[asset] = 0;
    }

    // Entry
    if (!this.positions[asset] && this.consecutiveRed[asset] >= this.params.requiredRed) {
      const activePositions = this.getActivePositionsCount();
      if (activePositions >= this.params.maxConcurrent) {
        console.log(`⚠️ [${asset}] Skipping - max concurrent reached (${activePositions}/${this.params.maxConcurrent})`);
        return;
      }
      
      const price = candle.close;
      const assetCapital = this.totalCapital * this.allocations[asset];
      this.positions[asset] = {
        asset,
        entryPrice: price,
        entryTimestamp: candle.timestamp,
        target: price * (1 + this.params.targetPct / 100),
        stop: price * (1 - this.params.stopPct / 100),
        size: assetCapital
      };
      console.log(`🔵 [${asset}] ENTER @ ${price} | target: ${this.positions[asset].target.toFixed(2)} | stop: ${this.positions[asset].stop.toFixed(2)}`);
      return;
    }

    // Exit
    if (this.positions[asset]) {
      const price = candle.close;
      const pnlPct = ((price - this.positions[asset].entryPrice) / this.positions[asset].entryPrice) * 100;
      const holdDays = Math.floor((candle.timestamp - this.positions[asset].entryTimestamp) / 86400);
      
      let exitReason = null;
      if (price >= this.positions[asset].target) exitReason = 'take_profit';
      else if (price <= this.positions[asset].stop) exitReason = 'stop_loss';
      else if (holdDays >= this.params.maxHoldDays) exitReason = 'timeout';
      
      if (exitReason) {
        const pnl = this.positions[asset].size * (pnlPct / 100);
        this.trades.push({
          asset, pnlPct, pnl, win: pnl > 0, reason: exitReason, holdDays,
          entryPrice: this.positions[asset].entryPrice,
          exitPrice: price
        });
        const winSymbol = pnl > 0 ? '✅' : '❌';
        console.log(`${winSymbol} [${asset}] EXIT @ ${price} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%) | ${exitReason}`);
        this.positions[asset] = null;
        this.consecutiveRed[asset] = 0;
        this.saveState();
      }
    }
  }

  async checkForNewData() {
    if (!this.db) await this.initDB();
    let anyNew = false;
    for (const asset of this.assets) {
      const candles = this.getCandles(asset);
      const lastIdx = this.lastProcessedIndices[asset] || -1;
      for (const candle of candles) {
        if (candle.index > lastIdx) {
          this.processCandle(asset, candle);
          this.lastProcessedIndices[asset] = candle.index;
          anyNew = true;
        }
      }
    }
    if (anyNew) {
      this.saveState();
      const wins = this.trades.filter(t => t.win).length;
      const winRate = this.trades.length ? (wins / this.trades.length * 100) : 0;
      console.log(`📊 Processed new candles | ${this.trades.length} trades | ${winRate.toFixed(1)}% WR`);
    }
  }

  async start() {
    console.log(`\n🚀 Starting Three Asset Portfolio Monitor — DRY_RUN`);
    console.log(`   Assets: LINK 40%, BTC 40%, LTC 20%`);
    console.log(`   Max concurrent: ${this.params.maxConcurrent}`);
    console.log(`   Checking for new candles every 5 minutes...\n`);
    await this.checkForNewData();
    setInterval(async () => {
      try { await this.checkForNewData(); }
      catch (err) { console.error('❌ Error:', err.message); }
    }, 5 * 60 * 1000);
  }
}

const monitor = new ThreeAssetMonitor();
monitor.start().catch(console.error);
