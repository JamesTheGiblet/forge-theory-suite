// src/grid-strategy.js
// CCE Grid Engine — BTC/USDC Grid Calculator
// Manages grid level calculation, order tracking, profit accounting

'use strict';

class GridCalculator {
  constructor(config = {}) {
    this.spacing      = config.spacing      || 0.01;   // 1% between levels
    this.levels       = config.levels       || 10;     // total grid levels
    this.capitalUSDC  = config.capitalUSDC  || 125;    // total capital in USDC
    this.makerFee     = config.makerFee     || 0.0016; // Kraken maker fee 0.16%
    this.takerFee     = config.takerFee     || 0.0026; // Kraken taker fee 0.26%
    this.stopLossPct  = config.stopLossPct  || 0.15;   // 15% drop triggers stop
    this.recentrePct  = config.recentrePct  || 0.05;   // 5% drift triggers recentre
    this.slippageRate = config.slippageRate || 0.001;  // 0.1% slippage estimate
    this.runawayPct   = config.runawayPct   || 0.20;   // 20% upside runaway triggers recentre
  }

  // Build grid levels around a centre price
  buildGrid(centrePrice) {
    const levels     = [];
    const perOrder   = this.capitalUSDC / this.levels;
    const halfLevels = Math.floor(this.levels / 2);

    for (let i = -halfLevels; i <= halfLevels; i++) {
      if (i === 0) continue; // skip exact centre
      const price  = +(centrePrice * (1 + i * this.spacing)).toFixed(2);
      const side   = i > 0 ? 'sell' : 'buy';
      const btcAmt = +(perOrder / price).toFixed(8);

      levels.push({
        level:   i,
        price,
        side,
        btcAmt,
        usdcAmt: perOrder,
        status:  'pending', // pending | open | filled | cancelled
        orderId: null,
        filledAt: null,
        profit:  0
      });
    }

    return levels.sort((a, b) => a.price - b.price);
  }

  // Calculate profit for a completed buy→sell pair
  calcCycleProfit(buyPrice, sellPrice, btcAmt) {
    const grossProfit = (sellPrice - buyPrice) * btcAmt;
    const buyFee      = buyPrice  * btcAmt * this.makerFee;
    const sellFee     = sellPrice * btcAmt * this.makerFee;
    const buySlippage  = buyPrice  * btcAmt * this.slippageRate;
    const sellSlippage = sellPrice * btcAmt * this.slippageRate;
    const netProfit    = grossProfit - buyFee - sellFee - buySlippage - sellSlippage;
    return +netProfit.toFixed(6);
  }

  // Check if grid needs recentring
  needsRecentre(currentPrice, centrePrice) {
    const drift = Math.abs(currentPrice - centrePrice) / centrePrice;
    return drift > this.recentrePct;
  }

  // Check if stop loss should trigger
  shouldStop(currentPrice, centrePrice) {
    const drop    = (centrePrice - currentPrice) / centrePrice;
    const runaway = (currentPrice - centrePrice) / centrePrice;
    return drop > this.stopLossPct || runaway > this.runawayPct;
  }

  // Get buy/sell levels separately
  getBuyLevels(grid)  { return grid.filter(l => l.side === 'buy'); }
  getSellLevels(grid) { return grid.filter(l => l.side === 'sell'); }

  // Get nearest unfilled level on each side
  getNearestBuy(grid, currentPrice) {
    const buys = grid
      .filter(l => l.side === 'buy' && l.status === 'open' && l.price < currentPrice)
      .sort((a, b) => b.price - a.price);
    return buys[0] || null;
  }

  getNearestSell(grid, currentPrice) {
    const sells = grid
      .filter(l => l.side === 'sell' && l.status === 'open' && l.price > currentPrice)
      .sort((a, b) => a.price - b.price);
    return sells[0] || null;
  }

  // Summary stats
  getStats(grid, completedCycles, totalProfit) {
    const openBuys   = grid.filter(l => l.side === 'buy'  && l.status === 'open').length;
    const openSells  = grid.filter(l => l.side === 'sell' && l.status === 'open').length;
    const filledBuys = grid.filter(l => l.side === 'buy'  && l.status === 'filled').length;

    return {
      openBuys,
      openSells,
      filledBuys,
      completedCycles,
      totalProfit: +totalProfit.toFixed(4),
      avgProfitPerCycle: completedCycles > 0
        ? +(totalProfit / completedCycles).toFixed(4)
        : 0
    };
  }
}

module.exports = GridCalculator;
