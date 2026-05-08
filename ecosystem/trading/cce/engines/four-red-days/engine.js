/**
 * Adaptive Intelligence Platform — Trading Engine
 * Part of the AIP suite of AI-powered tools
 * License: MIT
 */

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

class FourRedDays {
  constructor(config = {}) {
    this.id = 'four-red-days';
    this.name = '4 Red Days';
    this.symbol = config.symbol || 'BTC/USDC';
    this.timeframe = '1d';
    this.initialCapital = config.capital || 100;
    this.capital = this.initialCapital;
    this.status = config.status || 'dry_run';
    this.position = null;
    this.consecutiveRed = 0;
    this.trades = [];
    this.logFile = path.join(__dirname, 'dryrun.log');
    
    this.params = {
      targetPct: 1,
      stopPct: 0.75,
      maxHoldDays: 5,
      requiredRed: 4
    };
    
    this.initLog();
  }
  
  initLog() {
    const header = '\n' + '═'.repeat(60) + '\n';
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `${header}${this.name} — Dry Run\nStarted: ${timestamp}\nStatus: ${this.status}\n${'═'.repeat(60)}\n`);
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }
  
  onCandle(candle) {
    if (this.status === 'stopped') return;
    
    // Track consecutive red days
    if (candle.close < candle.open) {
      this.consecutiveRed++;
    } else {
      this.consecutiveRed = 0;
    }
    
    // Entry
    if (!this.position && this.consecutiveRed >= this.params.requiredRed) {
      this.enterPosition(candle);
    } 
    // Exit
    else if (this.position) {
      this.checkExit(candle);
    }
  }
  
  enterPosition(candle) {
    const price = candle.close;
    this.position = {
      entryPrice: price,
      entryDate: new Date().toISOString(),
      entryTimestamp: candle.timestamp,
      target: price * (1 + this.params.targetPct / 100),
      stop: price * (1 - this.params.stopPct / 100),
      exitDate: null,
      exitPrice: null,
      pnl: null
    };
    
    this.log(`🔵 ENTER @ ${price} | target: ${this.position.target.toFixed(2)} | stop: ${this.position.stop.toFixed(2)} | capital: $${this.capital.toFixed(2)}`);
  }
  
  checkExit(candle) {
    const price = candle.close;
    const pnlPct = (price - this.position.entryPrice) / this.position.entryPrice * 100;
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
      this.exitPosition(price, exitReason, pnlPct, holdDays);
    }
  }
  
  exitPosition(price, reason, pnlPct, holdDays) {
    const pnl = this.capital * (pnlPct / 100);
    this.capital += pnl;
    
    const trade = {
      entryDate: this.position.entryDate,
      exitDate: new Date().toISOString(),
      entryPrice: this.position.entryPrice,
      exitPrice: price,
      pnlPct: pnlPct,
      pnl: pnl,
      win: pnl > 0,
      reason: reason,
      holdDays: holdDays,
      capitalAfter: this.capital
    };
    
    this.trades.push(trade);
    
    const winSymbol = trade.win ? '✅' : '❌';
    this.log(`${winSymbol} EXIT @ ${price} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%) | ${reason} | hold: ${holdDays}d | capital: $${this.capital.toFixed(2)}`);
    
    this.position = null;
    this.consecutiveRed = 0;
  }
  
  getStats() {
    const wins = this.trades.filter(t => t.win).length;
    const losses = this.trades.filter(t => !t.win).length;
    const winRate = this.trades.length ? (wins / this.trades.length * 100) : 0;
    const totalReturn = ((this.capital - this.initialCapital) / this.initialCapital * 100);
    const avgPnl = this.trades.length ? this.trades.reduce((s, t) => s + t.pnlPct, 0) / this.trades.length : 0;
    const avgWin = wins ? this.trades.filter(t => t.win).reduce((s, t) => s + t.pnlPct, 0) / wins : 0;
    const avgLoss = losses ? this.trades.filter(t => !t.win).reduce((s, t) => s + t.pnlPct, 0) / losses : 0;
    
    return {
      trades: this.trades.length,
      wins,
      losses,
      winRate,
      totalReturn,
      avgPnl,
      avgWin,
      avgLoss,
      capital: this.capital,
      initialCapital: this.initialCapital
    };
  }
  
  printSummary() {
    const stats = this.getStats();
    console.log('\n' + '═'.repeat(60));
    console.log(`📊 ${this.name} — Dry Run Summary`);
    console.log('═'.repeat(60));
    console.log(`  Status:        ${this.status}`);
    console.log(`  Trades:        ${stats.trades}`);
    console.log(`  Win rate:      ${stats.winRate.toFixed(1)}%`);
    console.log(`  Total return:  ${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(1)}%`);
    console.log(`  Capital:       $${stats.capital.toFixed(2)} (start: $${stats.initialCapital})`);
    console.log(`  Avg win:       +${stats.avgWin.toFixed(2)}%`);
    console.log(`  Avg loss:      ${stats.avgLoss.toFixed(2)}%`);
    console.log('═'.repeat(60));
    
    // Append to log
    fs.appendFileSync(this.logFile, `\n${'═'.repeat(60)}\nSUMMARY\n${'═'.repeat(60)}\nTrades: ${stats.trades}\nWin rate: ${stats.winRate.toFixed(1)}%\nReturn: ${stats.totalReturn.toFixed(1)}%\nCapital: $${stats.capital.toFixed(2)}\n${'═'.repeat(60)}\n`);
  }
  
  stop() {
    this.status = 'stopped';
    this.printSummary();
    this.log(`🛑 Engine stopped. Final capital: $${this.capital.toFixed(2)}`);
  }
}

module.exports = FourRedDays;
