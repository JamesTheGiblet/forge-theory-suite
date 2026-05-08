// config/index.js — LCE Liquidation Cascade Engine Configuration
require('dotenv').config();

module.exports = {
  engine: {
    name: 'LCE',
    version: '1.0.0',
    cycleMs: 5 * 60 * 1000,       // 5-minute cycle
    tradeWindowMs: 30 * 60 * 1000, // Max 30min in a trade
    dryRun: process.env.DRY_RUN !== 'false', // Default: dry run
  },

  // Assets to watch — high OI, high liquidation frequency
  watchlist: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],

  // Liquidation signal thresholds
  signals: {
    // Minimum USD liquidated in last 5min to trigger STALKING
    minLiqUsd5m: 5_000_000,        // $5M
    // Minimum USD liquidated to confirm CASCADE (enter trade)
    minLiqUsd15m: 20_000_000,      // $20M
    // OI drop % that confirms cascade is real
    minOiDropPct: 1.5,             // 1.5% OI drop
    // Price momentum confirmation (% move in direction of cascade)
    minMomentumPct: 0.3,           // 0.3% move
    // RSI filter — don't chase into already-exhausted moves
    rsiMin: 25,
    rsiMax: 75,
  },

  // Risk management
  risk: {
    maxPositionPct: 0.15,          // Max 15% of portfolio per trade
    stopLossPct: 0.8,              // 0.8% stop loss (tight — fast market)
    takeProfitPct: 1.6,            // 1.6% take profit (2:1 R:R)
    trailingStopPct: 0.5,          // 0.5% trailing stop once in profit
    maxDailyLossPct: 3.0,          // Circuit breaker: halt if -3% day
    maxConcurrentTrades: 2,
  },

  // Data sources
  data: {
    coinglassBase: 'https://open-api.coinglass.com/public/v2',
    binanceBase: 'https://fapi.binance.com',
    krakenBase: 'https://api.kraken.com/0/public',
    coinglassApiKey: process.env.COINGLASS_API_KEY || '',
  },

  // Exchange (Kraken for execution — same as CCE)
  exchange: {
    id: 'kraken',
    apiKey: process.env.KRAKEN_API_KEY || '',
    secret: process.env.KRAKEN_SECRET || '',
    rateLimit: 1000,
  },

  // Notifications
  telegram: {
    token: process.env.TELEGRAM_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  // Dashboard
  dashboard: {
    port: process.env.LCE_PORT || 3004,
  },

  // Storage
  storage: {
    dbPath: process.env.LCE_DB_PATH || './lce.db',
  },
};
