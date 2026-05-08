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

class MultiAssetMeta {
  constructor(config = {}) {
    this.id = 'multi-asset-meta';
    this.name = 'Multi-Asset Meta Strategy';
    // BTC + DOGE only - ETH removed
    this.assets = config.assets || ['BTC/USD', 'DOGE/USD'];
    
    // Updated allocations - ETH removed, redistributed
    this.allocations = config.allocations || {
      'BTC/USD': 0.75,    // Increased from 60% to 75%
      'DOGE/USD': 0.25    // Increased from 15% to 25%
    };
    
    this.totalCapital = config.capital || 250;
    this.status = config.status || 'dry_run';
    this.positions = {};
    this.db = null;
    this.stats = {
      trades: [],
      wins: 0,
      losses: 0,
      totalPnl: 0,
      startCapital: this.totalCapital,
      capital: this.totalCapital
    };
    
    // Strategy parameters - BTC and DOGE only
    this.strategies = {
      'BTC/USD': {
        requiredRed: 4,
        targetPct: 1,
        stopPct: 0.75,
        maxHoldDays: 5,
        entryRule: 'consecutive_red'
      },
      'DOGE/USD': {
        requiredRed: 4,
        targetPct: 1,
        stopPct: 0.75,
        maxHoldDays: 5,
        entryRule: 'consecutive_red'
      }
    };
    
    // Per-asset state
    this.assetState = {};
    for (const asset of this.assets) {
      this.assetState[asset] = {
        consecutiveRed: 0,
        position: null,
        capital: this.totalCapital * this.allocations[asset],
        trades: []
      };
    }
    
    this.initLog();
  }
  
  async initDB(dbPath) {
    const SQL = await initSqlJs();
    const dbBuffer = fs.readFileSync(dbPath);
    this.db = new SQL.Database(dbBuffer);
  }
  
  initLog() {
    const logDir = path.join(__dirname);
    this.logFile = path.join(logDir, 'multi_asset.log');
    const header = '\n' + '═'.repeat(60) + '\n';
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `${header}${this.name} — ${this.status.toUpperCase()}\nStarted: ${timestamp}\nCapital: $${this.totalCapital}\nAllocations: BTC 75%, DOGE 25% (ETH removed)\n${'═'.repeat(60)}\n`);
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
  
  updateConsecutiveRed(asset, candle, state) {
    if (candle.close < candle.open) {
      state.consecutiveRed++;
    } else {
      state.consecutiveRed = 0;
    }
  }
  
  checkConsecutiveRedEntry(asset, candle, state, strategy) {
    if (state.consecutiveRed >= strategy.requiredRed) {
      const price = candle.close;
      const position = {
        entryPrice: price,
        entryDate: new Date().toISOString(),
        entryTimestamp: candle.timestamp,
        target: price * (1 + strategy.targetPct / 100),
        stop: price * (1 - strategy.stopPct / 100),
        asset: asset
      };
      state.position = position;
      this.log(`🔵 [${asset}] ENTER @ ${price} | target: ${position.target.toFixed(2)} | stop: ${position.stop.toFixed(2)} | capital: $${state.capital.toFixed(2)}`);
      return true;
    }
    return false;
  }
  
  checkExit(asset, candle, state, strategy) {
    if (!state.position) return false;
    
    const price = candle.close;
    const pnlPct = this.pctChange(state.position.entryPrice, price);
    const holdDays = Math.floor((candle.timestamp - state.position.entryTimestamp) / 86400);
    
    let exitReason = null;
    
    if (price >= state.position.target) {
      exitReason = 'take_profit';
    } else if (price <= state.position.stop) {
      exitReason = 'stop_loss';
    } else if (holdDays >= strategy.maxHoldDays) {
      exitReason = 'timeout';
    }
    
    if (exitReason) {
      const pnl = state.capital * (pnlPct / 100);
      state.capital += pnl;
      this.stats.totalPnl += pnl;
      this.stats.capital = this.stats.capital + pnl;
      
      const trade = {
        asset: asset,
        entryDate: state.position.entryDate,
        exitDate: new Date().toISOString(),
        entryPrice: state.position.entryPrice,
        exitPrice: price,
        pnlPct: pnlPct,
        pnl: pnl,
        win: pnl > 0,
        reason: exitReason,
        holdDays: holdDays
      };
      
      state.trades.push(trade);
      this.stats.trades.push(trade);
      
      if (trade.win) this.stats.wins++;
      else this.stats.losses++;
      
      const winSymbol = trade.win ? '✅' : '❌';
      this.log(`${winSymbol} [${asset}] EXIT @ ${price} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%) | ${exitReason} | hold: ${holdDays}d | capital: $${state.capital.toFixed(2)}`);
      
      state.position = null;
      state.consecutiveRed = 0;
      return true;
    }
    return false;
  }
  
  processCandle(asset, candle, candles, currentIdx) {
    const state = this.assetState[asset];
    const strategy = this.strategies[asset];
    
    if (!state || !strategy) return;
    
    this.updateConsecutiveRed(asset, candle, state);
    
    if (!state.position) {
      this.checkConsecutiveRedEntry(asset, candle, state, strategy);
    } else {
      this.checkExit(asset, candle, state, strategy);
    }
  }
  
  async loadCandlesFromDB(dbPath) {
    await this.initDB(dbPath);
    
    const candlesByAsset = {};
    
    for (const asset of this.assets) {
      const result = this.db.exec(
        `SELECT timestamp, open, high, low, close, volume
         FROM candles
         WHERE pair = ? AND interval = '1D'
         ORDER BY timestamp ASC`,
        [asset]
      );
      
      if (result.length) {
        const { columns, values } = result[0];
        candlesByAsset[asset] = values.map(row => {
          const candle = {};
          columns.forEach((col, i) => candle[col] = row[i]);
          return candle;
        });
        console.log(`${asset}: ${candlesByAsset[asset].length} candles`);
      } else {
        console.log(`${asset}: No data found`);
        candlesByAsset[asset] = [];
      }
    }
    
    return candlesByAsset;
  }
  
  async runBacktest(dbPath) {
    const candlesByAsset = await this.loadCandlesFromDB(dbPath);
    
    let allTimestamps = new Set();
    for (const asset of this.assets) {
      const candles = candlesByAsset[asset];
      if (candles) {
        candles.forEach(c => allTimestamps.add(c.timestamp));
      }
    }
    
    const sortedTimestamps = Array.from(allTimestamps).sort();
    
    for (const ts of sortedTimestamps) {
      for (const asset of this.assets) {
        const candles = candlesByAsset[asset];
        if (candles) {
          const idx = candles.findIndex(c => c.timestamp === ts);
          if (idx !== -1) {
            this.processCandle(asset, candles[idx], candles, idx);
          }
        }
      }
    }
    
    this.printSummary();
  }
  
  getStats() {
    const totalTrades = this.stats.trades.length;
    const winRate = totalTrades > 0 ? (this.stats.wins / totalTrades * 100) : 0;
    const totalReturn = ((this.stats.capital - this.stats.startCapital) / this.stats.startCapital * 100);
    
    const assetBreakdown = {};
    for (const asset of this.assets) {
      const state = this.assetState[asset];
      const trades = state.trades.length;
      const wins = state.trades.filter(t => t.win).length;
      const initialAllocation = this.totalCapital * this.allocations[asset];
      const assetReturn = ((state.capital - initialAllocation) / initialAllocation * 100);
      assetBreakdown[asset] = {
        trades,
        wins,
        winRate: trades > 0 ? (wins / trades * 100) : 0,
        capital: state.capital,
        return: assetReturn,
        allocation: this.allocations[asset] * 100
      };
    }
    
    return {
      totalTrades,
      wins: this.stats.wins,
      losses: this.stats.losses,
      winRate,
      totalReturn,
      capital: this.stats.capital,
      startCapital: this.stats.startCapital,
      assetBreakdown,
      recentTrades: this.stats.trades.slice(-20).reverse()
    };
  }
  
  printSummary() {
    const stats = this.getStats();
    console.log('\n' + '═'.repeat(60));
    console.log(`📊 ${this.name} — Summary`);
    console.log('═'.repeat(60));
    console.log(`  Status:        ${this.status}`);
    console.log(`  Total Trades:  ${stats.totalTrades}`);
    console.log(`  Win rate:      ${stats.winRate.toFixed(1)}%`);
    console.log(`  Total return:  ${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(1)}%`);
    console.log(`  Capital:       $${stats.capital.toFixed(2)} (start: $${stats.startCapital})`);
    console.log('\n  Per-Asset Breakdown:');
    console.log('  ' + '─'.repeat(50));
    for (const [asset, data] of Object.entries(stats.assetBreakdown)) {
      const returnSymbol = data.return >= 0 ? '+' : '';
      console.log(`  ${asset.padEnd(12)} ${String(data.trades).padStart(3)} trades | ${data.winRate.toFixed(0)}% WR | ${returnSymbol}${data.return.toFixed(1)}% return | $${data.capital.toFixed(2)} capital (${data.allocation}% allocated)`);
    }
    console.log('═'.repeat(60));
    
    fs.appendFileSync(this.logFile, `\n${'═'.repeat(60)}\nSUMMARY\n${'═'.repeat(60)}\nTotal Trades: ${stats.totalTrades}\nWin rate: ${stats.winRate.toFixed(1)}%\nReturn: ${stats.totalReturn.toFixed(1)}%\nCapital: $${stats.capital.toFixed(2)}\n${'═'.repeat(60)}\n`);
  }
  
  stop() {
    this.status = 'stopped';
    this.printSummary();
    this.log(`🛑 Engine stopped. Final capital: $${this.stats.capital.toFixed(2)}`);
  }
}

module.exports = MultiAssetMeta;
