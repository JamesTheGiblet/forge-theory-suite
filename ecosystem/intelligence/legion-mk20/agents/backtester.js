const { BaseAgent } = require('./base_agent');
const fs = require('fs');
const path = require('path');

class Backtester extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.backtestDir = "./data/backtests";
    this.historicalDataDir = "./data/historical";
    this.defaultPeriods = {
      '1h': 720,  // 30 days
      '4h': 180,  // 30 days
      '1d': 90    // 90 days
    };
  }
  
  async start() {
    await super.start();
    console.log('[Backtester] Starting backtesting engine...');
    this.ensureDirectories();
    console.log('[Backtester] Active. Ready to backtest strategies');
    return true;
  }
  
  ensureDirectories() {
    if (!fs.existsSync(this.backtestDir)) {
      fs.mkdirSync(this.backtestDir, { recursive: true });
    }
    if (!fs.existsSync(this.historicalDataDir)) {
      fs.mkdirSync(this.historicalDataDir, { recursive: true });
    }
  }
  
  async backtestStrategy(strategy, options = {}) {
    const timeframe = strategy.timeframe || '1h';
    const periods = options.periods || this.defaultPeriods[timeframe] || 720;
    const initialCapital = options.initialCapital || 10000;
    
    console.log(`[Backtester] Running backtest on ${strategy.scp_id} (${timeframe}, ${periods} periods)`);
    
    // Generate or load historical data
    const historicalData = await this.getHistoricalData(strategy.asset, timeframe, periods);
    
    // Run simulation
    const results = this.simulateTrades(strategy, historicalData, initialCapital);
    
    // Calculate metrics
    const metrics = this.calculateMetrics(results, initialCapital);
    
    // Save backtest results
    this.saveBacktestResults(strategy.scp_id, metrics, results);
    
    return metrics;
  }
  
  async getHistoricalData(asset, timeframe, periods) {
    // In production, fetch from Kraken API
    // For now, generate realistic synthetic data
    const data = [];
    let price = asset === 'BTC/USD' ? 50000 : asset === 'ETH/USD' ? 3000 : 100;
    
    for (let i = 0; i < periods; i++) {
      // Add realistic price movement (0.1% to 2% daily volatility)
      const change = (Math.random() - 0.5) * 0.02;
      price = price * (1 + change);
      
      // Add occasional trends
      if (i > 100 && i < 200) price *= 1.005; // uptrend
      if (i > 400 && i < 500) price *= 0.995; // downtrend
      
      data.push({
        timestamp: Date.now() - (periods - i) * this.getTimeframeMs(timeframe),
        open: price * (1 + (Math.random() - 0.5) * 0.001),
        high: price * (1 + Math.random() * 0.01),
        low: price * (1 - Math.random() * 0.01),
        close: price,
        volume: Math.random() * 1000
      });
    }
    
    return data;
  }
  
  getTimeframeMs(timeframe) {
    const map = { '15m': 15*60*1000, '1h': 60*60*1000, '4h': 4*60*60*1000, '1d': 24*60*60*1000 };
    return map[timeframe] || 60*60*1000;
  }
  
  simulateTrades(strategy, historicalData, initialCapital) {
    let capital = initialCapital;
    let position = 0;
    let trades = [];
    let inPosition = false;
    let entryPrice = 0;
    
    // Extract RSI threshold from strategy
    const rsiEntry = strategy.conditions?.entry?.all?.find(c => c.indicator === 'rsi')?.value || 30;
    const rsiExit = strategy.conditions?.exit?.any?.find(c => c.indicator === 'rsi')?.value || 65;
    const trailingStop = strategy.conditions?.exit?.any?.find(c => c.indicator === 'trailing_stop')?.percent || 1.5;
    const positionSize = parseFloat(strategy.risk?.position_size || 0.01);
    
    // Simulate RSI values (simplified)
    let rsi = 50;
    
    for (let i = 0; i < historicalData.length; i++) {
      const candle = historicalData[i];
      
      // Simulate RSI movement based on price changes
      const priceChange = (candle.close - (historicalData[i-1]?.close || candle.close)) / (historicalData[i-1]?.close || candle.close);
      rsi = Math.min(95, Math.max(5, rsi + priceChange * 100));
      
      // Entry signal (RSI oversold)
      if (!inPosition && rsi < rsiEntry) {
        const amount = capital * positionSize;
        position = amount / candle.close;
        capital -= amount;
        entryPrice = candle.close;
        inPosition = true;
        trades.push({
          type: 'BUY',
          price: candle.close,
          timestamp: candle.timestamp,
          rsi: rsi
        });
      }
      
      // Exit signals
      if (inPosition) {
        let shouldExit = false;
        let exitPrice = candle.close;
        let exitReason = '';
        
        // RSI overbought
        if (rsi > rsiExit) {
          shouldExit = true;
          exitReason = 'RSI_OVERBOUGHT';
        }
        
        // Trailing stop
        const highestPrice = Math.max(...trades.filter(t => t.type === 'BUY').map(t => t.price), candle.high);
        const drawdown = (highestPrice - candle.close) / highestPrice * 100;
        if (drawdown > trailingStop) {
          shouldExit = true;
          exitReason = 'TRAILING_STOP';
        }
        
        if (shouldExit) {
          const exitValue = position * exitPrice;
          capital += exitValue;
          const profit = exitValue - (position * entryPrice);
          trades.push({
            type: 'SELL',
            price: exitPrice,
            timestamp: candle.timestamp,
            profit: profit,
            reason: exitReason,
            rsi: rsi
          });
          position = 0;
          inPosition = false;
        }
      }
    }
    
    // Close any remaining position at end
    if (inPosition) {
      const exitValue = position * historicalData[historicalData.length - 1].close;
      capital += exitValue;
      trades.push({
        type: 'FORCE_CLOSE',
        price: historicalData[historicalData.length - 1].close,
        timestamp: historicalData[historicalData.length - 1].timestamp
      });
    }
    
    return {
      finalCapital: capital,
      totalReturn: ((capital - initialCapital) / initialCapital) * 100,
      trades: trades,
      winRate: this.calculateWinRate(trades)
    };
  }
  
  calculateWinRate(trades) {
    const completedTrades = trades.filter(t => t.type === 'SELL' && t.profit !== undefined);
    if (completedTrades.length === 0) return 0;
    const wins = completedTrades.filter(t => t.profit > 0).length;
    return (wins / completedTrades.length) * 100;
  }
  
  calculateMetrics(results, initialCapital) {
    const totalReturn = results.totalReturn;
    const winRate = results.winRate;
    const sharpeRatio = totalReturn / 15; // Simplified Sharpe
    const maxDrawdown = this.calculateMaxDrawdown(results.trades);
    
    // Composite score (80/20 weighted: 80% backtest, 20% validation)
    const backtestScore = (
      (Math.min(100, Math.max(0, totalReturn + 50)) * 0.4) +
      (winRate * 0.4) +
      (Math.max(0, 100 - maxDrawdown) * 0.2)
    );
    
    return {
      total_return: totalReturn,
      win_rate: winRate,
      sharpe_ratio: sharpeRatio,
      max_drawdown: maxDrawdown,
      num_trades: results.trades.filter(t => t.type === 'SELL').length,
      backtest_score: Math.min(100, Math.max(0, backtestScore)),
      final_capital: results.finalCapital
    };
  }
  
  calculateMaxDrawdown(trades) {
    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;
    
    for (const trade of trades) {
      if (trade.type === 'BUY') {
        runningTotal -= trade.price;
      } else if (trade.type === 'SELL') {
        runningTotal += trade.price;
        if (runningTotal > peak) peak = runningTotal;
        const drawdown = ((peak - runningTotal) / peak) * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }
  
  saveBacktestResults(strategyId, metrics, results) {
    const backtestFile = path.join(this.backtestDir, `${strategyId}_backtest.json`);
    const backtestResult = {
      strategy_id: strategyId,
      timestamp: new Date().toISOString(),
      metrics: metrics,
      trade_summary: {
        total_trades: results.trades.filter(t => t.type === 'SELL').length,
        final_capital: results.finalCapital
      }
    };
    fs.writeFileSync(backtestFile, JSON.stringify(backtestResult, null, 2));
  }
  
  getBacktestResults(strategyId) {
    const backtestFile = path.join(this.backtestDir, `${strategyId}_backtest.json`);
    if (fs.existsSync(backtestFile)) {
      return JSON.parse(fs.readFileSync(backtestFile, 'utf8'));
    }
    return null;
  }
}

module.exports = { Backtester };
