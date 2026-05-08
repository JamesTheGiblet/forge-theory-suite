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
const STATE_FILE = path.join(__dirname, 'monitor_state.json');

class FourRedDaysMonitor {
  constructor() {
    this.db = null;
    this.capital = 100;
    this.initialCapital = 100;
    this.position = null;
    this.consecutiveRed = 0;
    this.trades = [];
    this.lastProcessedIndex = -1;
    this.params = {
      targetPct: 1,
      stopPct: 0.75,
      maxHoldDays: 5,
      requiredRed: 4
    };
    this.loadState();
  }

  loadState() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        this.capital = state.capital || 100;
        this.trades = state.trades || [];
        this.lastProcessedIndex = state.lastProcessedIndex || -1;
        this.position = state.position || null;
        this.consecutiveRed = state.consecutiveRed || 0;
        console.log(`📂 Loaded state: ${this.trades.length} trades, capital: $${this.capital.toFixed(2)}`);
      } catch (e) {
        console.log('📂 No valid state, starting fresh');
      }
    }
  }

  saveState() {
    const state = {
      capital: this.capital,
      trades: this.trades,
      lastProcessedIndex: this.lastProcessedIndex,
      position: this.position,
      consecutiveRed: this.consecutiveRed,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  async initDB() {
    const SQL = await initSqlJs();
    const dbBuffer = fs.readFileSync(DB_PATH);
    this.db = new SQL.Database(dbBuffer);
  }

  getCandles() {
    const result = this.db.exec(
      `SELECT timestamp, open, high, low, close, volume
       FROM candles
       WHERE pair = 'BTC/USD' AND interval = '1D'
       ORDER BY timestamp ASC`
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

  pctChange(oldPrice, newPrice) {
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  processCandle(candle) {
    // Track consecutive red
    if (candle.close < candle.open) {
      this.consecutiveRed++;
    } else {
      this.consecutiveRed = 0;
    }

    // Entry
    if (!this.position && this.consecutiveRed >= this.params.requiredRed) {
      const price = candle.close;
      this.position = {
        entryPrice: price,
        entryTimestamp: candle.timestamp,
        target: price * (1 + this.params.targetPct / 100),
        stop: price * (1 - this.params.stopPct / 100)
      };
      console.log(`🔵 ENTER @ ${price} | target: ${this.position.target.toFixed(2)} | stop: ${this.position.stop.toFixed(2)} | capital: $${this.capital.toFixed(2)}`);
      return;
    }

    // Exit
    if (this.position) {
      const price = candle.close;
      const pnlPct = this.pctChange(this.position.entryPrice, price);
      const holdDays = Math.floor((candle.timestamp - this.position.entryTimestamp) / 86400);
      
      let exitReason = null;
      
      if (price >= this.position.target) {
        exitReason = 'take_profit';
      } else if (price <= this.position.stop) {
        exitReason = 'stop_loss';
      } else if (holdDays >= this.params.maxHoldDays) {
        exitReason = 'timeout';
      }
      
      if (exitReason) {
        const pnl = this.capital * (pnlPct / 100);
        this.capital += pnl;
        
        const trade = {
          entryPrice: this.position.entryPrice,
          exitPrice: price,
          pnlPct: pnlPct,
          pnl: pnl,
          win: pnl > 0,
          reason: exitReason,
          holdDays: holdDays
        };
        
        this.trades.push(trade);
        
        const winSymbol = trade.win ? '✅' : '❌';
        console.log(`${winSymbol} EXIT @ ${price} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%) | ${exitReason} | hold: ${holdDays}d | capital: $${this.capital.toFixed(2)}`);
        
        this.position = null;
        this.consecutiveRed = 0;
        this.saveState();
      }
    }
  }

  async checkForNewData() {
    if (!this.db) await this.initDB();

    const candles = this.getCandles();
    if (candles.length === 0) return;

    let newCount = 0;

    for (const candle of candles) {
      if (candle.index > this.lastProcessedIndex) {
        this.processCandle(candle);
        this.lastProcessedIndex = candle.index;
        newCount++;
      }
    }

    if (newCount > 0) {
      this.saveState();
      const wins = this.trades.filter(t => t.win).length;
      const winRate = this.trades.length ? (wins / this.trades.length * 100) : 0;
      const totalReturn = ((this.capital - this.initialCapital) / this.initialCapital * 100);
      console.log(`📊 Processed ${newCount} new candles | ${this.trades.length} trades | ${winRate.toFixed(1)}% WR | ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}% return`);
    }
  }

  async start() {
    console.log(`\n🚀 Starting Four Red Days Monitor — DRY_RUN`);
    console.log(`   Monitoring: BTC/USD`);
    console.log(`   Checking for new candles every 5 minutes...\n`);

    await this.checkForNewData();

    setInterval(async () => {
      try {
        await this.checkForNewData();
      } catch (err) {
        console.error('❌ Error:', err.message);
      }
    }, 5 * 60 * 1000);
  }

  stop() {
    console.log('\n🛑 Stopping monitor...');
    this.saveState();
    if (this.db) this.db.close();
    process.exit(0);
  }
}

const monitor = new FourRedDaysMonitor();

process.on('SIGINT', () => {
  monitor.stop();
});

process.on('SIGTERM', () => {
  monitor.stop();
});

monitor.start().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
