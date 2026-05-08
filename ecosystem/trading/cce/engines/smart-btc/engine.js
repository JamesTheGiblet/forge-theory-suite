/**
 * Adaptive Intelligence Platform — Trading Engine
 * Part of the AIP suite of AI-powered tools
 * License: MIT
 */

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.env.HOME, 'kraken-intelligence/data/intelligence.db');
const STATE_FILE = path.join(__dirname, 'engine_state.json');

class SmartBTCStrategy {
  constructor(config = {}) {
    this.id = 'smart-btc';
    this.name = 'Smart BTC Strategy';
    this.symbol = config.symbol || 'BTC/USD';
    this.capital = config.capital || 100;
    this.initialCapital = this.capital;
    this.status = config.status || 'dry_run';
    this.position = null;
    this.consecutiveRed = 0;
    this.db = null;
    this.trades = [];
    
    this.params = {
      targetPct: 5,
      stopPct: 2.5,
      maxHoldDays: 14,
      rsiPeriod: 21,
      rsiThreshold: 20,
      entryTiming: 'next_open'  // trigger_close, next_open, next_close
    };
    
    this.loadState();
    this.initLog();
  }
  
  loadState() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        this.capital = state.capital || this.initialCapital;
        this.trades = state.trades || [];
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
      position: this.position,
      consecutiveRed: this.consecutiveRed,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }
  
  initLog() {
    this.logFile = path.join(__dirname, 'dryrun.log');
    const header = '\n' + '═'.repeat(60) + '\n';
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `${header}${this.name} — ${this.status.toUpperCase()}\nStarted: ${timestamp}\nCapital: $${this.capital}\nStrategy: 4-red OR RSI(21)<20 | Entry: ${this.params.entryTiming} | Target: ${this.params.targetPct}% | Stop: ${this.params.stopPct}% | Hold: ${this.params.maxHoldDays}d\n${'═'.repeat(60)}\n`);
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }
  
  pctChange(oldPrice, newPrice) {
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }
  
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i-1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
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
       WHERE pair = ? AND interval = '1D'
       ORDER BY timestamp ASC`,
      [this.symbol]
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
  
  checkEntry(candle, candles, i) {
    // Check consecutive red
    let signal4Red = false;
    if (i >= 3) {
      const day1 = candles[i-2]?.close < candles[i-3]?.open;
      const day2 = candles[i-1]?.close < candles[i-2]?.open;
      const day3 = candles[i]?.close < candles[i-1]?.open;
      signal4Red = day1 && day2 && day3;
    }
    
    // Check RSI(21) < 20
    let signalRSI = false;
    if (i >= this.params.rsiPeriod) {
      const prices = candles.slice(i - this.params.rsiPeriod, i + 1).map(c => c.close);
      const rsi = this.calculateRSI(prices, this.params.rsiPeriod);
      signalRSI = rsi < this.params.rsiThreshold;
    }
    
    const signal = signal4Red || signalRSI;
    
    if (signal) {
      let entryPrice = candle.close;
      let entryTimestamp = candle.timestamp;
      
      if (this.params.entryTiming === 'next_open' && i + 1 < candles.length) {
        entryPrice = candles[i + 1].open;
        entryTimestamp = candles[i + 1].timestamp;
      } else if (this.params.entryTiming === 'next_close' && i + 1 < candles.length) {
        entryPrice = candles[i + 1].close;
        entryTimestamp = candles[i + 1].timestamp;
      }
      
      return { entryPrice, entryTimestamp, signalType: signal4Red ? '4-red' : 'RSI' };
    }
    return null;
  }
  
  async checkForNewData() {
    if (!this.db) await this.initDB();
    
    const candles = this.getCandles();
    if (candles.length === 0) return;
    
    let lastProcessedIndex = this.lastProcessedIndex || -1;
    let newCount = 0;
    
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      
      if (i > lastProcessedIndex) {
        // Track consecutive red
        if (candle.close < candle.open) {
          this.consecutiveRed++;
        } else {
          this.consecutiveRed = 0;
        }
        
        // Entry check
        if (!this.position) {
          const entry = this.checkEntry(candle, candles, i);
          if (entry) {
            this.enterPosition(entry.entryPrice, entry.entryTimestamp, entry.signalType);
          }
        }
        
        // Exit check
        if (this.position) {
          this.checkExit(candle);
        }
        
        lastProcessedIndex = i;
        newCount++;
      }
    }
    
    this.lastProcessedIndex = lastProcessedIndex;
    if (newCount > 0) {
      this.saveState();
      this.printStatus();
    }
  }
  
  enterPosition(price, timestamp, signalType) {
    this.position = {
      entryPrice: price,
      entryTimestamp: timestamp,
      entryDate: new Date().toISOString(),
      target: price * (1 + this.params.targetPct / 100),
      stop: price * (1 - this.params.stopPct / 100),
      signalType: signalType
    };
    this.log(`🔵 ENTER (${signalType}) @ ${price} | target: ${this.position.target.toFixed(2)} | stop: ${this.position.stop.toFixed(2)} | capital: $${this.capital.toFixed(2)}`);
  }
  
  checkExit(candle) {
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
        holdDays: holdDays,
        signalType: this.position.signalType,
        exitDate: new Date().toISOString()
      };
      
      this.trades.push(trade);
      
      const winSymbol = trade.win ? '✅' : '❌';
      this.log(`${winSymbol} EXIT @ ${price} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%) | ${exitReason} | hold: ${holdDays}d | capital: $${this.capital.toFixed(2)}`);
      
      this.position = null;
      this.consecutiveRed = 0;
      this.saveState();
    }
  }
  
  printStatus() {
    const totalTrades = this.trades.length;
    const wins = this.trades.filter(t => t.win).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
    const totalReturn = ((this.capital - this.initialCapital) / this.initialCapital * 100);
    console.log(`\n📊 STATUS: ${totalTrades} trades | ${winRate.toFixed(1)}% WR | $${this.capital.toFixed(2)} (${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%)`);
  }
  
  async start() {
    console.log(`\n🚀 Starting ${this.name} — ${this.status.toUpperCase()} mode`);
    console.log(`   Strategy: 4-red OR RSI(21)<20`);
    console.log(`   Entry: ${this.params.entryTiming} | Target: ${this.params.targetPct}% | Stop: ${this.params.stopPct}% | Hold: ${this.params.maxHoldDays}d`);
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
    this.status = 'stopped';
    const totalTrades = this.trades.length;
    const wins = this.trades.filter(t => t.win).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
    const totalReturn = ((this.capital - this.initialCapital) / this.initialCapital * 100);
    
    console.log('\n' + '═'.repeat(60));
    console.log(`📊 ${this.name} — Summary`);
    console.log('═'.repeat(60));
    console.log(`  Trades:      ${totalTrades}`);
    console.log(`  Win rate:    ${winRate.toFixed(1)}%`);
    console.log(`  Return:      ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`);
    console.log(`  Capital:     $${this.capital.toFixed(2)}`);
    console.log('═'.repeat(60));
    
    fs.appendFileSync(this.logFile, `\n${'═'.repeat(60)}\nSUMMARY\n${'═'.repeat(60)}\nTrades: ${totalTrades}\nWin rate: ${winRate.toFixed(1)}%\nReturn: ${totalReturn.toFixed(1)}%\nCapital: $${this.capital.toFixed(2)}\n${'═'.repeat(60)}\n`);
    this.saveState();
    if (this.db) this.db.close();
  }
}

module.exports = SmartBTCStrategy;
