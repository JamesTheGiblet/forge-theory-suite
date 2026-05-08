const fs = require('fs');
const path = require('path');
const { getCandles, getCurrentPrice } = require('./kraken_adapter');

// Analyze price and volume patterns to detect whale activity
class CustomOnChainAnalyzer {
  constructor() {
    this.whaleThresholds = {
      'BTC/USD': 100,      // 100+ BTC = whale
      'ETH/USD': 1000,     // 1000+ ETH = whale
      'SOL/USD': 5000,     // 5000+ SOL = whale
      'XRP/USD': 50000,    // 50000+ XRP = whale
      'LINK/USD': 10000,   // 10000+ LINK = whale
      'LTC/USD': 2000,     // 2000+ LTC = whale
      'DOGE/USD': 500000   // 500000+ DOGE = whale
    };
  }

  detectWhaleFromCandles(candles, asset) {
    if (!candles || candles.length < 10) return null;
    
    const recent = candles.slice(-10);
    const volumeAvg = recent.slice(0, -1).reduce((sum, c) => sum + c.volume, 0) / 9;
    const lastVolume = recent[recent.length - 1].volume;
    const volumeSpike = lastVolume / volumeAvg;
    
    // Detect unusual volume spikes
    if (volumeSpike > 3) {
      const threshold = this.whaleThresholds[asset] || 100;
      const estimatedVolume = lastVolume;
      
      return {
        detected: true,
        type: 'volume_spike',
        asset,
        volumeSpike: volumeSpike.toFixed(1),
        estimatedVolume,
        threshold,
        severity: volumeSpike > 5 ? 'high' : 'medium',
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  detectAccumulation(candles, asset) {
    if (!candles || candles.length < 50) return null;
    
    const recent = candles.slice(-20);
    const older = candles.slice(-50, -20);
    
    const recentVolume = recent.reduce((sum, c) => sum + c.volume, 0) / 20;
    const olderVolume = older.reduce((sum, c) => sum + c.volume, 0) / 30;
    const volumeIncrease = recentVolume / olderVolume;
    
    // Green candles on high volume = accumulation
    const greenCandles = recent.filter(c => c.close > c.open).length;
    const greenRatio = greenCandles / 20;
    
    if (volumeIncrease > 1.5 && greenRatio > 0.6) {
      return {
        detected: true,
        type: 'accumulation',
        asset,
        volumeIncrease: volumeIncrease.toFixed(1),
        greenRatio: (greenRatio * 100).toFixed(0),
        severity: volumeIncrease > 2 ? 'high' : 'medium',
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  detectDistribution(candles, asset) {
    if (!candles || candles.length < 50) return null;
    
    const recent = candles.slice(-20);
    const older = candles.slice(-50, -20);
    
    const recentVolume = recent.reduce((sum, c) => sum + c.volume, 0) / 20;
    const olderVolume = older.reduce((sum, c) => sum + c.volume, 0) / 30;
    const volumeIncrease = recentVolume / olderVolume;
    
    // Red candles on high volume = distribution
    const redCandles = recent.filter(c => c.close < c.open).length;
    const redRatio = redCandles / 20;
    
    if (volumeIncrease > 1.5 && redRatio > 0.6) {
      return {
        detected: true,
        type: 'distribution',
        asset,
        volumeIncrease: volumeIncrease.toFixed(1),
        redRatio: (redRatio * 100).toFixed(0),
        severity: volumeIncrease > 2 ? 'high' : 'medium',
        timestamp: Date.now()
      };
    }
    
    return null;
  }
}

module.exports = { CustomOnChainAnalyzer };
