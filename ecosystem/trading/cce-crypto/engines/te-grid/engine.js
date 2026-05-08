// src/cce-grid-engine.js
// CCE Grid Engine — BTC/USDC Automated Grid Trading
// Places buy orders below and sell orders above current price.
// Profits from BTC oscillating within the grid.
// Fully autonomous — places and manages orders via Kraken API.

'use strict';

const GridCalculator    = require('./grid-strategy');
const GridStorageManager = require('./grid-storage');

// Grid states
const GRID_STATE = {
  INITIALISING: 'INITIALISING',
  ACTIVE:       'ACTIVE',
  RECENTRING:   'RECENTRING',
  STOPPED:      'STOPPED',
  PAUSED:       'PAUSED'
};

class CCEGridEngine {
  constructor(config, notifier, exchangeConnector) {
    this.config    = config;
    this.notifier  = notifier;
    this.exchange  = exchangeConnector;
    // Grid uses dedicated API key to avoid nonce conflicts with main engine
    const gridKey    = process.env.KRAKEN_GRID_KEY    || process.env.KRAKEN_API_KEY;
    const gridSecret = process.env.KRAKEN_GRID_SECRET || process.env.KRAKEN_API_SECRET;
    if (gridKey && gridSecret) {
      const ccxt = require('ccxt');
      this.krakenDirect = new ccxt.kraken({
        apiKey: gridKey,
        secret: gridSecret,
        timeout: 30000,
        enableRateLimit: true
      });
    }

    const gridCfg = config.grid || {};

    this.calculator = new GridCalculator({
      spacing:     gridCfg.spacing     || 0.01,
      levels:      gridCfg.levels      || 10,
      capitalUSDC: gridCfg.capitalUSDC || 125,
      makerFee:    gridCfg.makerFee    || 0.0016,
      takerFee:    gridCfg.takerFee    || 0.0026,
      stopLossPct: gridCfg.stopLossPct || 0.15,
      recentrePct: gridCfg.recentrePct || 0.05
    });

    this.storage   = new GridStorageManager(config.database?.path);
    this.dryRun    = true; // Registry requires default true — flipped by start() if CCE_DRY_RUN=false

    // Grid state
    this.gridState      = GRID_STATE.INITIALISING;
    this.grid           = [];
    this.centrePrice    = 0;
    this.runNumber      = 0;
    this.completedCycles = 0;
    this.totalProfit    = 0;
    this.portfolioValue = this.calculator.capitalUSDC;
    this.isRunning      = false;
    this.cycleCount     = 0;

    // Mock order tracking for dry run
    this.mockOrders     = new Map();
    this.mockOrderId    = 1000;
  }

  async start(intervalMinutes = 5) {
    // Read from modes.js — registry validates constructor (dryRun:true), this runs after
    const modes = require('../../modes');
    if (!modes.isDryRun('te-grid')) this.dryRun = false;
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    await this.storage.init();

    console.log('\n[GRID] 📊 Starting CCE Grid Engine');
    console.log(`[GRID] ⏱️  Check Interval: ${intervalMinutes}min`);
    console.log(`[GRID] 💰 Capital: $${this.calculator.capitalUSDC} USDC`);
    console.log(`[GRID] 📐 Spacing: ${(this.calculator.spacing * 100).toFixed(1)}% | Levels: ${this.calculator.levels}`);
    console.log(`[GRID] 🔧 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE ⚠️'}\n`);

    await this.notifier.send(
      `<b>[GRID] 📊 Grid Engine Started</b>\nCapital: $${this.calculator.capitalUSDC} USDC\nPair: BTC/USDC\nSpacing: ${(this.calculator.spacing * 100).toFixed(1)}%\nLevels: ${this.calculator.levels}\nMode: ${this.dryRun ? 'DRY RUN' : '⚠️ LIVE'}`,
      'info'
    );

    // Initial grid setup
    await this._setupGrid();

    while (this.isRunning) {
      await this._runCycle();
      if (!this.isRunning) break;

      const nextRun = new Date(Date.now() + intervalMs);
      console.log(`[GRID] ⏳ Next check: ${nextRun.toLocaleTimeString()}`);
      await this._sleep(intervalMs);
    }

    console.log('[GRID] 🛑 Grid engine stopped.');
  }

  stop() {
    console.log('[GRID] 🛑 Stopping grid engine...');
    this.isRunning = false;
    this._cancelAllOrders();
    this.storage.close();
  }

  // ============================================================================
  // GRID SETUP
  // ============================================================================

  async _setupGrid() {
    try {
      const price = await this._getBTCPrice();
      if (!price) throw new Error('Could not get BTC price for grid setup');

      this.centrePrice = price;
      this.grid        = this.calculator.buildGrid(price);

      console.log(`[GRID] 🏗️  Building grid around $${price}`);
      console.log(`[GRID]    ${this.calculator.levels} levels | $${(this.calculator.capitalUSDC / this.calculator.levels).toFixed(2)} per level`);

      // Place all orders
      let placed = 0;
      for (const level of this.grid) {
        const success = await this._placeOrder(level);
        if (success) placed++;
        await this._sleep(500); // small delay between orders
      }

      this.gridState = GRID_STATE.ACTIVE;

      console.log(`[GRID] ✅ Grid active — ${placed} orders placed`);
      console.log(`[GRID]    Buy levels:  ${this.calculator.getBuyLevels(this.grid).length}`);
      console.log(`[GRID]    Sell levels: ${this.calculator.getSellLevels(this.grid).length}`);

      await this.notifier.send([
        `<b>[GRID] 🏗️ Grid Built</b>`,
        ``,
        `Centre: $${price.toLocaleString()}`,
        `Levels: ${placed} orders placed`,
        ``,
        `Lowest buy:  $${Math.min(...this.calculator.getBuyLevels(this.grid).map(l => l.price)).toLocaleString()}`,
        `Highest sell: $${Math.max(...this.calculator.getSellLevels(this.grid).map(l => l.price)).toLocaleString()}`,
        ``,
        `${this.dryRun ? '🔵 DRY RUN — simulating fills' : '⚠️ LIVE orders on Kraken'}`
      ].join('\n'), 'info');

      await this.storage.logEvent('GRID_BUILT', `Grid built around $${price}`, price, this.portfolioValue);

    } catch (err) {
      console.error('[GRID] ❌ Grid setup failed:', err.message);
      this.gridState = GRID_STATE.STOPPED;
    }
  }

  // ============================================================================
  // MAIN CYCLE
  // ============================================================================

  async _runCycle() {
    this.cycleCount++;
    try {
      this.runNumber++;

      const price = await this._getBTCPrice();
      if (!price) {
        console.warn('[GRID] ⚠️  Could not fetch price — skipping cycle');
        return;
      }

      console.log(`\n[GRID] ${'─'.repeat(50)}`);
      console.log(`[GRID] 🔄 #${this.runNumber} | BTC: $${price.toLocaleString()} | State: ${this.gridState}`);
      console.log(`[GRID]    Centre: $${this.centrePrice.toLocaleString()} | Profit: $${this.totalProfit.toFixed(4)}`);

      // 1. Check stop loss
      if (this.calculator.shouldStop(price, this.centrePrice)) {
        await this._triggerStopLoss(price);
        return;
      }

      // 2. Check for filled orders (dry run: simulate fills)
      if (this.dryRun) {
        await this._simulateFills(price);
      } else {
        await this._checkRealFills();
      }

      // 3. Check if recentring needed
      if (this.calculator.needsRecentre(price, this.centrePrice)) {
        await this._recentreGrid(price);
        return;
      }

      // 4. Replace any filled buy orders with new sells (and vice versa)
      await this._replaceFilledOrders(price);

      // 5. Log stats
      const stats = this.calculator.getStats(this.grid, this.completedCycles, this.totalProfit);
      console.log(`[GRID]    Open buys: ${stats.openBuys} | Open sells: ${stats.openSells} | Cycles: ${stats.completedCycles}`);

      await this.storage.logCycle({
        run_number:       this.runNumber,
        btc_price:        price,
        centre_price:     this.centrePrice,
        open_buys:        stats.openBuys,
        open_sells:       stats.openSells,
        filled_buys:      stats.filledBuys,
        completed_cycles: this.completedCycles,
        total_profit:     this.totalProfit,
        portfolio_value:  this.portfolioValue,
        grid_state:       this.gridState
      });

    } catch (err) {
      console.error('[GRID] ❌ Cycle error:', err.message);
    }
  }

  // ============================================================================
  // DRY RUN — SIMULATE FILLS
  // ============================================================================

  async _simulateFills(currentPrice) {
    let cyclesThisRun = 0;

    for (const level of this.grid) {
      if (level.status !== 'open') continue;

      // Buy order fills when price drops to or below buy price
      if (level.side === 'buy' && currentPrice <= level.price) {
        level.status   = 'filled';
        level.filledAt = new Date();
        console.log(`[GRID] 🟢 BUY filled @ $${level.price} (BTC: $${currentPrice})`);

        await this.storage.logOrder({
          order_id:   `DRY-${level.level}-BUY`,
          side:       'buy',
          price:      level.price,
          btc_amount: level.btcAmt,
          usdc_amount: level.usdcAmt,
          status:     'filled',
          level:      level.level
        });
      }

      // Sell order fills when price rises to or above sell price
      if (level.side === 'sell' && currentPrice >= level.price) {
        // Find matching buy level
        const matchingBuy = this.grid.find(l =>
          l.side === 'buy' &&
          l.status === 'filled' &&
          Math.abs(l.level) === level.level - 1
        );

        if (matchingBuy) {
          const profit = this.calculator.calcCycleProfit(
            matchingBuy.price, level.price, level.btcAmt
          );

          level.status  = 'filled';
          level.profit  = profit;
          this.totalProfit    += profit;
          this.portfolioValue += profit;
          this.completedCycles++;
          cyclesThisRun++;

          const holdSecs = matchingBuy.filledAt
            ? Math.round((Date.now() - matchingBuy.filledAt.getTime()) / 1000)
            : 0;

          console.log(`[GRID] 💰 CYCLE COMPLETE: buy $${matchingBuy.price} → sell $${level.price} | profit: +$${profit.toFixed(4)}`);

          await this.storage.logCompleted({
            buy_price:       matchingBuy.price,
            sell_price:      level.price,
            btc_amount:      level.btcAmt,
            gross_profit:    (level.price - matchingBuy.price) * level.btcAmt,
            fees:            (level.price * level.btcAmt * this.calculator.makerFee * 2),
            net_profit:      profit,
            cycle_duration_s: holdSecs
          });

          await this.notifier.send([
            `<b>[GRID] 💰 Cycle Complete</b>`,
            ``,
            `Buy:  $${matchingBuy.price.toLocaleString()}`,
            `Sell: $${level.price.toLocaleString()}`,
            `Profit: +$${profit.toFixed(4)}`,
            ``,
            `Total profit: $${this.totalProfit.toFixed(4)}`,
            `Cycles: ${this.completedCycles}`,
            `Portfolio: $${this.portfolioValue.toFixed(2)}`
          ].join('\n'), 'trade');

          // Reset both levels for reuse
          matchingBuy.status = 'pending';
          level.status       = 'pending';
        } else {
          level.status = 'filled';
          console.log(`[GRID] 🔴 SELL filled @ $${level.price} (no matching buy)`);
        }
      }
    }
  }

  // ============================================================================
  // LIVE ORDER MANAGEMENT
  // ============================================================================

  async _placeOrder(level) {
    try {
      if (this.dryRun) {
        level.status  = 'open';
        level.orderId = `DRY-${++this.mockOrderId}`;
        return true;
      }

      // Live order placement via Kraken (dedicated instance to avoid nonce conflicts)
      const krakenInstance = this.krakenDirect || this.exchange;
      const order = await krakenInstance.createOrder(
        'BTC/USDC',
        'limit',
        level.side,
        level.btcAmt,
        level.price,
        { timeInForce: 'GTC', postOnly: true } // maker only for lower fees
      );

      level.status  = 'open';
      level.orderId = order.id;

      await this.storage.logOrder({
        order_id:    order.id,
        side:        level.side,
        price:       level.price,
        btc_amount:  level.btcAmt,
        usdc_amount: level.usdcAmt,
        status:      'open',
        level:       level.level
      });

      return true;
    } catch (err) {
      console.error(`[GRID] ❌ Order placement failed (level ${level.level}):`, err.message);
      return false;
    }
  }

  async _checkRealFills() {
    try {
      for (const level of this.grid) {
        if (level.status !== 'open' || !level.orderId) continue;

        const order = await this.exchange.fetchOrder(level.orderId, 'BTC/USDC');

        if (order.status === 'closed' || order.status === 'filled') {
          level.status   = 'filled';
          level.filledAt = new Date();
          console.log(`[GRID] ✅ Order ${level.orderId} filled (${level.side} @ $${level.price})`);
        }
      }
    } catch (err) {
      console.error('[GRID] ❌ Fill check error:', err.message);
    }
  }

  async _replaceFilledOrders(currentPrice) {
    for (const level of this.grid) {
      if (level.status !== 'pending') continue;

      // Re-open orders that were reset after a complete cycle
      const shouldOpen = (level.side === 'buy'  && level.price < currentPrice) ||
                         (level.side === 'sell' && level.price > currentPrice);

      if (shouldOpen) {
        await this._placeOrder(level);
      }
    }
  }

  async _cancelAllOrders() {
    if (this.dryRun) {
      this.grid.forEach(l => { if (l.status === 'open') l.status = 'cancelled'; });
      return;
    }

    for (const level of this.grid) {
      if (level.status === 'open' && level.orderId) {
        try {
          await this.exchange.cancelOrder(level.orderId, 'BTC/USDC');
          level.status = 'cancelled';
        } catch (err) {
          console.error(`[GRID] Cancel failed for ${level.orderId}:`, err.message);
        }
      }
    }
  }

  // ============================================================================
  // GRID MANAGEMENT
  // ============================================================================

  async _recentreGrid(currentPrice) {
    const drift = ((currentPrice - this.centrePrice) / this.centrePrice * 100).toFixed(1);
    console.log(`\n[GRID] 🔄 RECENTRING grid (drift: ${drift}%)`);

    this.gridState = GRID_STATE.RECENTRING;

    await this.notifier.send([
      `<b>[GRID] 🔄 Recentring Grid</b>`,
      ``,
      `Old centre: $${this.centrePrice.toLocaleString()}`,
      `New centre: $${currentPrice.toLocaleString()}`,
      `Drift: ${drift}%`,
      ``,
      `Cancelling ${this.grid.filter(l => l.status === 'open').length} orders...`
    ].join('\n'), 'info');

    // Cancel all open orders
    await this._cancelAllOrders();

    // Rebuild grid around new price
    this.centrePrice = currentPrice;
    this.grid        = this.calculator.buildGrid(currentPrice);

    // Place new orders
    let placed = 0;
    for (const level of this.grid) {
      const success = await this._placeOrder(level);
      if (success) placed++;
      await this._sleep(300);
    }

    this.gridState = GRID_STATE.ACTIVE;

    console.log(`[GRID] ✅ Recentred — ${placed} new orders placed`);

    await this.storage.logEvent(
      'RECENTRE',
      `Grid recentred from $${this.centrePrice} to $${currentPrice} (drift: ${drift}%)`,
      currentPrice,
      this.portfolioValue
    );
  }

  async _triggerStopLoss(currentPrice) {
    const drop = ((this.centrePrice - currentPrice) / this.centrePrice * 100).toFixed(1);
    console.log(`\n[GRID] 🛑 STOP LOSS triggered (drop: ${drop}%)`);

    this.gridState = GRID_STATE.STOPPED;
    this.isRunning = false;

    await this._cancelAllOrders();

    await this.notifier.send([
      `<b>[GRID] 🛑 STOP LOSS TRIGGERED</b>`,
      ``,
      `BTC drop: ${drop}% from grid centre`,
      `Centre was: $${this.centrePrice.toLocaleString()}`,
      `Current:    $${currentPrice.toLocaleString()}`,
      ``,
      `All orders cancelled. Capital preserved in USDC.`,
      `Total profit before stop: $${this.totalProfit.toFixed(4)}`,
      `Cycles completed: ${this.completedCycles}`
    ].join('\n'), 'error');

    await this.storage.logEvent(
      'STOP_LOSS',
      `Stop loss triggered at $${currentPrice} (drop: ${drop}%)`,
      currentPrice,
      this.portfolioValue
    );
  }

  // ============================================================================
  // PRICE FEED
  // ============================================================================

  async _getBTCPrice() {
    return new Promise((resolve) => {
      const https = require('https');
      const url = 'https://api.kraken.com/0/public/Ticker?pair=BTCUSDC';
      const req = https.get(url, { headers: { 'User-Agent': 'CCE-Grid/1.0' } }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const d = JSON.parse(body);
            const pair = Object.values(d.result || {})[0];
            const price = pair ? parseFloat(pair.c[0]) : null;
            resolve(price);
          } catch (e) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getState() { return this.gridState; }

  async runCycle() { return this._runCycle(); }

  getStatus() {
    return {
      state:           this.gridState,
      centrePrice:     this.centrePrice,
      completedCycles: this.completedCycles,
      totalProfit:     this.totalProfit,
      portfolioValue:  this.portfolioValue,
      openOrders:      (this.grid || []).filter(l => l.status === 'open').length,
      runNumber:       this.runNumber
    };
  }
}

module.exports = CCEGridEngine;
