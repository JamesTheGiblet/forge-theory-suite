// src/data-feed.js — LCE Data Feed
// Sources: Coinglass (liquidations + OI), Binance futures (OI delta), Kraken (price/RSI)

const axios = require('axios');
const config = require('../config');

class DataFeed {
  constructor() {
    this.cache = {};
    this.cacheMs = 60_000; // 1min cache
  }

  // ─── Primary: Liquidation data from Coinglass ───────────────────────────

  async getLiquidations(symbol = 'BTC', windowMin = 15) {
    const key = `liq_${symbol}_${windowMin}`;
    if (this._isCached(key)) return this.cache[key].data;

    try {
      // Coinglass liquidation aggregation endpoint
      const response = await axios.get(
        `${config.data.coinglassBase}/liquidation_info`,
        {
          headers: { coinglassSecret: config.data.coinglassApiKey },
          params: { symbol, time_type: windowMin },
          timeout: 8000,
        }
      );

      const d = response.data?.data;
      if (!d) throw new Error('No liquidation data');

      const result = {
        symbol,
        longLiqUsd: d.longLiquidationUsd || 0,
        shortLiqUsd: d.shortLiquidationUsd || 0,
        totalLiqUsd: (d.longLiquidationUsd || 0) + (d.shortLiquidationUsd || 0),
        dominantSide: d.longLiquidationUsd > d.shortLiquidationUsd ? 'LONG' : 'SHORT',
        windowMin,
        ts: Date.now(),
      };

      this._setCache(key, result);
      return result;
    } catch (err) {
      console.warn(`[LCE] Coinglass liq error (${symbol}): ${err.message}`);
      return this._fallbackLiquidations(symbol, windowMin);
    }
  }

  // Fallback: Binance public liquidation stream aggregation
  async _fallbackLiquidations(symbol, windowMin) {
    try {
      const binanceSymbol = symbol + 'USDT';
      // Binance futures force orders endpoint (public)
      const response = await axios.get(
        `${config.data.binanceBase}/fapi/v1/allForceOrders`,
        {
          params: { symbol: binanceSymbol, limit: 500 },
          timeout: 8000,
        }
      );

      const orders = response.data || [];
      const cutoff = Date.now() - windowMin * 60 * 1000;
      const recent = orders.filter(o => o.time > cutoff);

      let longLiqUsd = 0;
      let shortLiqUsd = 0;
      for (const o of recent) {
        const usd = parseFloat(o.origQty) * parseFloat(o.price);
        if (o.side === 'BUY') shortLiqUsd += usd;  // Shorts liquidated = BUY
        else longLiqUsd += usd;                      // Longs liquidated = SELL
      }

      return {
        symbol,
        longLiqUsd,
        shortLiqUsd,
        totalLiqUsd: longLiqUsd + shortLiqUsd,
        dominantSide: longLiqUsd > shortLiqUsd ? 'LONG' : 'SHORT',
        windowMin,
        source: 'binance_fallback',
        ts: Date.now(),
      };
    } catch (err) {
      console.warn(`[LCE] Binance liq fallback failed: ${err.message}`);
      return { symbol, totalLiqUsd: 0, longLiqUsd: 0, shortLiqUsd: 0, dominantSide: 'UNKNOWN', windowMin, ts: Date.now() };
    }
  }

  // ─── Open Interest delta (OI drop = cascade confirmation) ───────────────

  async getOpenInterest(symbol = 'BTC') {
    const key = `oi_${symbol}`;
    if (this._isCached(key)) return this.cache[key].data;

    try {
      const binanceSymbol = symbol + 'USDT';
      const [currentOI, histOI] = await Promise.all([
        axios.get(`${config.data.binanceBase}/fapi/v1/openInterest`, {
          params: { symbol: binanceSymbol }, timeout: 6000,
        }),
        axios.get(`${config.data.binanceBase}/futures/data/openInterestHist`, {
          params: { symbol: binanceSymbol, period: '5m', limit: 6 }, timeout: 6000,
        }),
      ]);

      const current = parseFloat(currentOI.data.openInterest);
      const hist = histOI.data || [];
      const prev = hist.length > 1 ? parseFloat(hist[hist.length - 2].sumOpenInterest) : current;
      const dropPct = ((prev - current) / prev) * 100;

      const result = {
        symbol,
        currentOI: current,
        prevOI: prev,
        dropPct: Math.max(0, dropPct), // Positive = OI dropped (longs/shorts wiped)
        ts: Date.now(),
      };

      this._setCache(key, result);
      return result;
    } catch (err) {
      console.warn(`[LCE] OI fetch error (${symbol}): ${err.message}`);
      return { symbol, currentOI: 0, prevOI: 0, dropPct: 0, ts: Date.now() };
    }
  }

  // ─── Price data + RSI from Kraken (same as CCE) ─────────────────────────

  async getPriceData(krakenPair = 'XBTUSD') {
    const key = `price_${krakenPair}`;
    if (this._isCached(key)) return this.cache[key].data;

    try {
      const response = await axios.get(`${config.data.krakenBase}/OHLC`, {
        params: { pair: krakenPair, interval: 5 }, // 5-min candles
        timeout: 8000,
      });

      const pairKey = Object.keys(response.data.result).find(k => k !== 'last');
      const candles = response.data.result[pairKey];

      if (!candles || candles.length < 20) throw new Error('Insufficient candle data');

      const closes = candles.map(c => parseFloat(c[4]));
      const latest = closes[closes.length - 1];
      const prev5 = closes[closes.length - 6]; // 5 candles ago = 25min

      const rsi = this._calcRSI(closes, 14);
      const momentumPct = ((latest - prev5) / prev5) * 100;

      const result = {
        pair: krakenPair,
        price: latest,
        rsi,
        momentumPct,
        candles: candles.slice(-20),
        ts: Date.now(),
      };

      this._setCache(key, result);
      return result;
    } catch (err) {
      console.warn(`[LCE] Kraken price error (${krakenPair}): ${err.message}`);
      return null;
    }
  }

  // ─── Aggregate signal snapshot for one asset ────────────────────────────

  async getSignalSnapshot(symbol) {
    const krakenMap = { 'BTC/USDT': 'XBTUSD', 'ETH/USDT': 'ETHUSD', 'SOL/USDT': 'SOLUSD' };
    const baseSymbol = symbol.split('/')[0];
    const krakenPair = krakenMap[symbol] || 'XBTUSD';

    const [liq5m, liq15m, oi, price] = await Promise.all([
      this.getLiquidations(baseSymbol, 5),
      this.getLiquidations(baseSymbol, 15),
      this.getOpenInterest(baseSymbol),
      this.getPriceData(krakenPair),
    ]);

    return { symbol, liq5m, liq15m, oi, price, ts: Date.now() };
  }

  // ─── RSI calculation ────────────────────────────────────────────────────

  _calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const rs = gains / (losses || 0.001);
    return 100 - 100 / (1 + rs);
  }

  // ─── Cache helpers ───────────────────────────────────────────────────────

  _isCached(key) {
    return this.cache[key] && (Date.now() - this.cache[key].ts < this.cacheMs);
  }

  _setCache(key, data) {
    this.cache[key] = { data, ts: Date.now() };
  }
}

module.exports = DataFeed;
