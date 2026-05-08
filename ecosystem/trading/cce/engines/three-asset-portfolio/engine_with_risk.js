#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.env.HOME, 'kraken-intelligence/data/intelligence.db');
const STATE_FILE = path.join(__dirname, 'portfolio_state.json');

class ThreeAssetPortfolioWithRisk {
  constructor(config = {}) {
    this.id = 'three-asset-portfolio';
    this.name = 'Three Asset Portfolio';
    this.assets = config.assets || ['LINK/USD', 'BTC/USD', 'LTC/USD'];
    this.allocations = config.allocations || {
      'LINK/USD': 0.40,
      'BTC/USD': 0.40,
      'LTC/USD': 0.20
    };
    this.totalCapital = config.capital || 250;
    this.status = config.status || 'dry_run';
    this.db = null;
    
    // Risk management parameters
    this.risk = {
      maxConcurrentPositions: 2,     // Never hold more than 2 positions simultaneously
      correlationThreshold: 0.7,      // Skip signal if asset correlation > 0.7 with existing position
      maxDrawdown: 0.15,              // Stop trading if drawdown > 15%
      circuitBreaker: false,          // Activated if drawdown exceeded
      maxDailyLoss: 0.05              // Stop for the day if loss > 5%
    };
    
    // Strategy parameters
    this.strategy = {
      requiredRed: 4,
      targetPct: 1,
      stopPct: 0.75,
      maxHoldDays: 5
    };
    
    // Per-asset state
    this.assetState = {};
    for (const asset of this.assets) {
      this.assetState[asset] = {
        consecutiveRed: 0,
        position: null,
        capital: this.totalCapital * this.allocations[asset],
        trades: [],
        lastProcessedIndex: -1,
        correlation: 0
      };
    }
    
    this.stats = {
      trades: [],
      wins: 0,
      losses: 0,
      totalPnl: 0,
      startCapital: this.totalCapital,
      capital: this.totalCapital,
      startDate: new Date().toISOString(),
      dailyPnl: {},
      circuitBreakerTriggered: false
    };
    
    this.loadState();
    this.initLog();
  }
  
  loadState() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        this.assetState = state.assetState || this.assetState;
        this.stats = state.stats || this.stats;
        console.log(`📂 Loaded state: ${this.stats.trades.length} trades, capital: $${this.stats.capital.toFixed(2)}`);
      } catch (e) {
        console.log('📂 No valid state, starting fresh');
      }
    }
  }
  
  saveState() {
    const state = {
      assetState: this.assetState,
      stats: this.stats,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }
  
  initLog() {
    this.logFile = path.join(__dirname, 'dryrun_risk.log');
    const header = '\n' + '═'.repeat(60) + '\n';
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `${header}${this.name} WITH RISK MANAGEMENT — ${this.status.toUpperCase()}\nStarted: ${timestamp}\nCapital: $${this.totalCapital}\nMax Concurrent Positions: ${this.risk.maxConcurrentPositions}\n${'═'.repeat(60)}\n`);
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
  
  async initDB() {
    const SQL = await initSqlJs();
    const dbBuffer = fs.readFileSync(DB_PATH);
    this.db = new SQL.Database(dbBuffer);
  }
  
  getCandles(pair) {
    const result = this.db.exec(
      `SELECT timestamp, open, high, low, close, volume
       FROM candles
       WHERE pair = ? AND interval = '1D'
       ORDER BY timestamp ASC`,
      [pair]
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
    let count = 0;
    for (const asset of this.assets) {
      if (this.assetState[asset].position) count++;
    }
    return count;
  }
  
  checkCorrelation(asset) {
    // Simple correlation check - if BTC already in position and asset is correlated
    // This is a simplified version; full correlation would need historical data
    const correlatedPairs = {
      'LINK/USD': ['BTC/USD'],
      'BTC/USD': ['LINK/USD', 'LTC/USD'],
      'LTC/USD': ['BTC/USD']
    };
    
    for (const otherAsset of this.assets) {
      if (otherAsset !== asset && this.assetState[otherAsset].position) {
        if (correlatedPairs[asset]?.includes(otherAsset)) {
          this.log(`⚠️ [${asset}] Skipping - correlated with existing position in ${otherAsset}`);
          return false;
        }
      }
    }
    return true;
  }
  
  processCandle(asset, candle, state) {
    // Update consecutive red count
    if (candle.close < candle.open) {
      state.consecutiveRed++;
    } else {
      state.consecutiveRed = 0;
    }
    
    // Entry with risk checks
    if (!state.position && state.consecutiveRed >= this.strategy.requiredRed) {
      const activePositions = this.getActivePositionsCount();
      
      // Check circuit breaker
      if (this.risk.circuitBreaker) {
        this.log(`⚠️ Circuit breaker active - skipping entry for ${asset}`);
        return false;
      }
      
      // Check max concurrent positions
      if (activePositions >= this.risk.maxConcurrentPositions) {
        this.log(`⚠️ [${asset}] Skipping - max concurrent positions reached (${activePositions}/${this.risk.maxConcurrentPositions})`);
        return false;
      }
      
      // Check correlation
      if (!this.checkCorrelation(asset)) {
        return false;
      }
      
      const price = candle.close;
      state.position = {
        entryPrice: price,
        entryDate: new Date().toISOString(),
        entryTimestamp: candle.timestamp,
        target: price * (1 + this.strategy.targetPct / 100),
        stop: price * (1 - this.strategy.stopPct / 100)
      };
      this.log(`🔵 [${asset}] ENTER @ ${price} | target: ${state.position.target.toFixed(2)} | stop: ${state.position.stop.toFixed(2)} | active: ${activePositions + 1}/${this.risk.maxConcurrentPositions}`);
      return true;
    }
    
    // Exit
    if (state.position) {
      const price = candle.close;
      const pnlPct = this.pctChange(state.position.entryPrice, price);
      const holdDays = Math.floor((candle.timestamp - state.position.entryTimestamp) / 86400);
      
      let exitReason = null;
      
      if (price >= state.position.target) {
        exitReason = 'take_profit';
      } else if (price <= state.position.stop) {
        exitReason = 'stop_loss';
      } else if (holdDays >= this.strategy.maxHoldDays) {
        exitReason = 'timeout';
      }
      
      if (exitReason) {
        const pnl = state.capital * (pnlPct / 100);
        state.capital += pnl;
        this.stats.totalPnl += pnl;
        this.stats.capital = this.stats.capital + pnl;
        
        const trade = {
          asset,
          entryPrice: state.position.entryPrice,
          exitPrice: price,
          pnlPct,
          pnl,
          win: pnl > 0,
          reason: exitReason,
          holdDays,
          exitDate: new Date().toISOString()
        };
        
        state.trades.push(trade);
        this.stats.trades.push(trade);
        
        if (trade.win) this.stats.wins++;
        else this.stats.losses++;
        
        const winSymbol = trade.win ? '✅' : '❌';
        this.log(`${winSymbol} [${asset}] EXIT @ ${price} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%) | ${exitReason} | hold: ${holdDays}d | capital: $${state.capital.toFixed(2)}`);
        
        state.position = null;
        state.consecutiveRed = 0;
        
        // Check drawdown
        const totalReturn = ((this.stats.capital - this.stats.startCapital) / this.stats.startCapital * 100);
        if (totalReturn < -this.risk.maxDrawdown * 100) {
          this.risk.circuitBreaker = true;
          this.log(`🚨 CIRCUIT BREAKER TRIGGERED! Drawdown: ${totalReturn.toFixed(1)}%`);
        }
        
        return true;
      }
    }
    return false;
  }
  
  async checkForNewData() {
    if (!this.db) await this.initDB();
    
    let anyNew = false;
    
    for (const asset of this.assets) {
      const candles = this.getCandles(asset);
      const state = this.assetState[asset];
      
      if (candles.length === 0) continue;
      
      for (const candle of candles) {
        if (candle.index > state.lastProcessedIndex) {
          this.processCandle(asset, candle, state);
          state.lastProcessedIndex = candle.index;
          anyNew = true;
        }
      }
    }
    
    if (anyNew) {
      this.saveState();
      this.printStatus();
    }
  }
  
  printStatus() {
    const totalTrades = this.stats.trades.length;
    const winRate = totalTrades > 0 ? (this.stats.wins / totalTrades * 100) : 0;
    const totalReturn = ((this.stats.capital - this.stats.startCapital) / this.stats.startCapital * 100);
    const activePositions = this.getActivePositionsCount();
    
    console.log(`\n📊 STATUS: ${totalTrades} trades | ${winRate.toFixed(1)}% WR | $${this.stats.capital.toFixed(2)} (${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%) | Active: ${activePositions}/${this.risk.maxConcurrentPositions}`);
  }
  
  printSummary() {
    const totalTrades = this.stats.trades.length;
    const winRate = totalTrades > 0 ? (this.stats.wins / totalTrades * 100) : 0;
    const totalReturn = ((this.stats.capital - this.stats.startCapital) / this.stats.startCapital * 100);
    
    console.log('\n' + '═'.repeat(60));
    console.log(`📊 ${this.name} WITH RISK MANAGEMENT — Summary`);
    console.log('═'.repeat(60));
    console.log(`  Status:              ${this.status}`);
    console.log(`  Circuit Breaker:     ${this.risk.circuitBreaker ? 'ACTIVATED' : 'OK'}`);
    console.log(`  Max Concurrent:      ${this.risk.maxConcurrentPositions}`);
    console.log(`  Total Trades:        ${totalTrades}`);
    console.log(`  Win rate:            ${winRate.toFixed(1)}%`);
    console.log(`  Total return:        ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`);
    console.log(`  Capital:             $${this.stats.capital.toFixed(2)} (start: $${this.stats.startCapital})`);
    console.log('═'.repeat(60));
    
    fs.appendFileSync(this.logFile, `\n${'═'.repeat(60)}\nSUMMARY\n${'═'.repeat(60)}\nTotal Trades: ${totalTrades}\nWin rate: ${winRate.toFixed(1)}%\nReturn: ${totalReturn.toFixed(1)}%\nCapital: $${this.stats.capital.toFixed(2)}\nCircuit Breaker: ${this.risk.circuitBreaker}\n${'═'.repeat(60)}\n`);
  }
  
  async start() {
    console.log(`\n🚀 Starting ${this.name} WITH RISK MANAGEMENT — ${this.status.toUpperCase()} mode`);
    console.log(`   Max concurrent positions: ${this.risk.maxConcurrentPositions}`);
    console.log(`   Monitoring: ${this.assets.join(', ')}`);
    console.log(`   Checking for new candles every 5 minutes...\n`);
    
    await this.checkForNewData();
    
    setInterval(async () => {
      try {
        await this.checkForNewData();
      } catch (err) {
        console.error('❌ Error checking for new data:', err.message);
      }
    }, 5 * 60 * 1000);
  }
  
  stop() {
    this.status = 'stopped';
    this.printSummary();
    this.saveState();
    this.log(`🛑 Engine stopped. Final capital: $${this.stats.capital.toFixed(2)}`);
    if (this.db) this.db.close();
  }
}

module.exports = ThreeAssetPortfolioWithRisk;
