// src/exchange-connector.js — LCE Exchange Connector
// Paper mode by default, live via Kraken CCXT

const config = require('../config');

class ExchangeConnector {
  constructor() {
    this.dryRun = config.engine.dryRun;
    this.exchange = null;
    this.paperPortfolio = {
      balance: parseFloat(process.env.PAPER_BALANCE || '1000'),
      positions: [],
    };

    if (!this.dryRun) {
      try {
        const ccxt = require('ccxt');
        this.exchange = new ccxt.kraken({
          apiKey: config.exchange.apiKey,
          secret: config.exchange.secret,
          rateLimit: config.exchange.rateLimit,
        });
      } catch (err) {
        console.warn('[LCE] CCXT not available — falling back to dry run');
        this.dryRun = true;
      }
    }

    console.log(`[LCE] Exchange: ${this.dryRun ? '📋 DRY RUN (paper)' : '🔴 LIVE (Kraken)'}`);
  }

  async getPortfolioValue() {
    if (this.dryRun) {
      return { total: this.paperPortfolio.balance, currency: 'USDT' };
    }
    try {
      const balance = await this.exchange.fetchBalance();
      return { total: balance.total?.USDT || 0, currency: 'USDT' };
    } catch (err) {
      console.warn(`[LCE] Balance fetch error: ${err.message}`);
      return { total: 0, currency: 'USDT' };
    }
  }

  async enterPosition(symbol, side, currentPrice, portfolioValue) {
    const positionSize = portfolioValue * config.risk.maxPositionPct;
    const qty = positionSize / currentPrice;

    const stopLoss = side === 'BUY'
      ? currentPrice * (1 - config.risk.stopLossPct / 100)
      : currentPrice * (1 + config.risk.stopLossPct / 100);

    const takeProfit = side === 'BUY'
      ? currentPrice * (1 + config.risk.takeProfitPct / 100)
      : currentPrice * (1 - config.risk.takeProfitPct / 100);

    const position = {
      symbol,
      side,
      entryPrice: currentPrice,
      qty,
      sizeUsd: positionSize,
      stopLoss,
      takeProfit,
      openedAt: Date.now(),
    };

    if (this.dryRun) {
      console.log(`[LCE] 📋 PAPER TRADE: ${side} ${qty.toFixed(6)} ${symbol} @ $${currentPrice.toFixed(2)}`);
      console.log(`[LCE]    SL: $${stopLoss.toFixed(2)} | TP: $${takeProfit.toFixed(2)} | Size: $${positionSize.toFixed(2)}`);
      this.paperPortfolio.positions.push(position);
      return position;
    }

    try {
      const order = await this.exchange.createMarketOrder(symbol, side.toLowerCase(), qty);
      position.orderId = order.id;
      console.log(`[LCE] ✅ LIVE ORDER: ${side} ${symbol} @ $${currentPrice.toFixed(2)} | ID: ${order.id}`);
      return position;
    } catch (err) {
      console.error(`[LCE] Order failed: ${err.message}`);
      return null;
    }
  }

  async exitPosition(position) {
    const { symbol, side, qty } = position;
    const closeSide = side === 'BUY' ? 'SELL' : 'BUY';

    if (this.dryRun) {
      console.log(`[LCE] 📋 PAPER EXIT: ${closeSide} ${qty.toFixed(6)} ${symbol}`);
      this.paperPortfolio.positions = this.paperPortfolio.positions.filter(
        p => p.openedAt !== position.openedAt
      );
      return { success: true, dryRun: true };
    }

    try {
      const order = await this.exchange.createMarketOrder(symbol, closeSide.toLowerCase(), qty);
      console.log(`[LCE] ✅ LIVE EXIT: ${closeSide} ${symbol} | ID: ${order.id}`);
      return { success: true, orderId: order.id };
    } catch (err) {
      console.error(`[LCE] Exit failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

module.exports = ExchangeConnector;
