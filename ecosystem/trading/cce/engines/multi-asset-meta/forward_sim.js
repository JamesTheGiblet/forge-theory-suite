#!/usr/bin/env node
'use strict';

const MultiAssetMeta = require('./engine');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.env.HOME, 'kraken-intelligence/data/intelligence.db');

async function forwardSimulation() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔬 FORWARD SIMULATION — Multi-Asset Meta Strategy');
  console.log('═'.repeat(60));
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60) + '\n');

  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(dbBuffer);

  const assets = ['BTC/USD', 'ETH/USD', 'DOGE/USD'];
  const candlesByAsset = {};

  for (const asset of assets) {
    const result = db.exec(
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
    }
  }

  db.close();

  // Split data: 80% backtest, 20% forward test
  const minLength = Math.min(...assets.map(a => candlesByAsset[a].length));
  const splitIdx = Math.floor(minLength * 0.8);
  
  console.log(`\nSplit point: ${splitIdx} candles (80%)`);
  console.log(`Forward period: ${minLength - splitIdx} candles (20%)\n`);

  // Create backtest (training) and forward (test) datasets
  const backtestCandles = {};
  const forwardCandles = {};

  for (const asset of assets) {
    backtestCandles[asset] = candlesByAsset[asset].slice(0, splitIdx);
    forwardCandles[asset] = candlesByAsset[asset].slice(splitIdx);
    
    const startDate = new Date(forwardCandles[asset][0]?.timestamp * 1000).toISOString().split('T')[0];
    const endDate = new Date(forwardCandles[asset][forwardCandles[asset].length - 1]?.timestamp * 1000).toISOString().split('T')[0];
    console.log(`${asset} forward period: ${startDate} to ${endDate}`);
  }

  // Run backtest on historical period
  console.log('\n' + '─'.repeat(60));
  console.log('📊 BACKTEST (80% of data)');
  console.log('─'.repeat(60));
  
  const backtestEngine = new MultiAssetMeta({ status: 'dry_run', capital: 250 });
  
  // Manually process backtest candles
  const backtestTimestamps = new Set();
  for (const asset of assets) {
    backtestCandles[asset].forEach(c => backtestTimestamps.add(c.timestamp));
  }
  
  const backtestSorted = Array.from(backtestTimestamps).sort();
  for (const ts of backtestSorted) {
    for (const asset of assets) {
      const idx = backtestCandles[asset].findIndex(c => c.timestamp === ts);
      if (idx !== -1) {
        backtestEngine.processCandle(asset, backtestCandles[asset][idx], backtestCandles[asset], idx);
      }
    }
  }
  
  const backtestStats = backtestEngine.getStats();
  console.log(`\nBacktest Results:`);
  console.log(`  Trades:      ${backtestStats.totalTrades}`);
  console.log(`  Win rate:    ${backtestStats.winRate.toFixed(1)}%`);
  console.log(`  Return:      ${backtestStats.totalReturn >= 0 ? '+' : ''}${backtestStats.totalReturn.toFixed(1)}%`);
  console.log(`  Capital:     $${backtestStats.capital.toFixed(2)}`);

  // Run forward simulation on unseen data
  console.log('\n' + '─'.repeat(60));
  console.log('🔮 FORWARD SIMULATION (20% unseen data)');
  console.log('─'.repeat(60));
  
  const forwardEngine = new MultiAssetMeta({ status: 'dry_run', capital: 250 });
  
  const forwardTimestamps = new Set();
  for (const asset of assets) {
    forwardCandles[asset].forEach(c => forwardTimestamps.add(c.timestamp));
  }
  
  const forwardSorted = Array.from(forwardTimestamps).sort();
  for (const ts of forwardSorted) {
    for (const asset of assets) {
      const idx = forwardCandles[asset].findIndex(c => c.timestamp === ts);
      if (idx !== -1) {
        forwardEngine.processCandle(asset, forwardCandles[asset][idx], forwardCandles[asset], idx);
      }
    }
  }
  
  const forwardStats = forwardEngine.getStats();
  console.log(`\nForward Simulation Results:`);
  console.log(`  Trades:      ${forwardStats.totalTrades}`);
  console.log(`  Win rate:    ${forwardStats.winRate.toFixed(1)}%`);
  console.log(`  Return:      ${forwardStats.totalReturn >= 0 ? '+' : ''}${forwardStats.totalReturn.toFixed(1)}%`);
  console.log(`  Capital:     $${forwardStats.capital.toFixed(2)}`);

  // Comparison
  console.log('\n' + '═'.repeat(60));
  console.log('📈 COMPARISON: Backtest vs Forward');
  console.log('═'.repeat(60));
  
  const winRateDiff = forwardStats.winRate - backtestStats.winRate;
  const returnDiff = forwardStats.totalReturn - backtestStats.totalReturn;
  
  console.log(`\n  Metric          | Backtest | Forward | Difference`);
  console.log('  ' + '─'.repeat(50));
  console.log(`  Win rate        | ${backtestStats.winRate.toFixed(1)}%      | ${forwardStats.winRate.toFixed(1)}%      | ${winRateDiff >= 0 ? '+' : ''}${winRateDiff.toFixed(1)}%`);
  console.log(`  Return          | ${backtestStats.totalReturn.toFixed(1)}%      | ${forwardStats.totalReturn.toFixed(1)}%      | ${returnDiff >= 0 ? '+' : ''}${returnDiff.toFixed(1)}%`);
  console.log(`  Trades          | ${backtestStats.totalTrades}       | ${forwardStats.totalTrades}       | ${forwardStats.totalTrades - backtestStats.totalTrades}`);
  console.log(`  Final Capital   | $${backtestStats.capital.toFixed(2)}  | $${forwardStats.capital.toFixed(2)}  | $${(forwardStats.capital - backtestStats.capital).toFixed(2)}`);

  // Per-asset forward breakdown
  console.log('\n' + '─'.repeat(60));
  console.log('📊 FORWARD SIMULATION — Per-Asset Breakdown');
  console.log('─'.repeat(60));
  
  for (const [asset, data] of Object.entries(forwardStats.assetBreakdown)) {
    const returnSymbol = data.return >= 0 ? '+' : '';
    console.log(`  ${asset.padEnd(12)} ${String(data.trades).padStart(3)} trades | ${data.winRate.toFixed(0)}% WR | ${returnSymbol}${data.return.toFixed(1)}% return | $${data.capital.toFixed(2)} capital`);
  }

  // Verdict
  console.log('\n' + '═'.repeat(60));
  console.log('🎯 VERDICT');
  console.log('═'.repeat(60));
  
  const degradation = backtestStats.winRate - forwardStats.winRate;
  
  if (forwardStats.totalReturn > 0 && forwardStats.winRate >= 55) {
    console.log('\n✅ STRATEGY VALIDATED — Forward simulation confirms edge');
    console.log(`   Forward return: +${forwardStats.totalReturn.toFixed(1)}%`);
    console.log(`   Forward win rate: ${forwardStats.winRate.toFixed(1)}%`);
    console.log(`   Ready for live deployment`);
  } else if (forwardStats.totalReturn > 0 && forwardStats.winRate >= 50) {
    console.log('\n🟡 MARGINAL EDGE — Degradation detected but still positive');
    console.log(`   Win rate drop: ${degradation.toFixed(1)}% (${backtestStats.winRate.toFixed(1)}% → ${forwardStats.winRate.toFixed(1)}%)`);
    console.log(`   Recommend extended dry run`);
  } else {
    console.log('\n❌ STRATEGY FAILED — Edge does not hold out-of-sample');
    console.log(`   Forward return: ${forwardStats.totalReturn.toFixed(1)}%`);
    console.log(`   Forward win rate: ${forwardStats.winRate.toFixed(1)}%`);
    console.log(`   Do not deploy — revisit strategy`);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('Forward simulation complete');
  console.log('═'.repeat(60) + '\n');
}

forwardSimulation().catch(console.error);
