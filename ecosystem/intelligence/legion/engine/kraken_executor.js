require('dotenv').config();
const KrakenAPI = require('kraken-api');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.KRAKEN_API_KEY;
const API_SECRET = process.env.KRAKEN_API_SECRET;
const LIVE_TRADING = process.env.LIVE_TRADING === 'true';

let kraken = null;
let isLive = false;

function initKraken() {
  if (!API_KEY || !API_SECRET) {
    console.log('[KRAKEN] API keys not configured. Running in dry-run mode.');
    return null;
  }
  if (!LIVE_TRADING) {
    console.log('[KRAKEN] LIVE_TRADING=false. Running in dry-run mode.');
    return null;
  }
  kraken = new KrakenAPI(API_KEY, API_SECRET);
  isLive = true;
  console.log('[KRAKEN] Initialized for LIVE trading');
  return kraken;
}

async function getBalance(asset = 'USD') {
  if (!isLive) return 10000;
  try {
    const balance = await kraken.api('Balance');
    return balance.result[asset] || 0;
  } catch (err) {
    console.error('[KRAKEN] Balance error:', err.message);
    return 0;
  }
}

async function getTicker(pair = 'XBTUSD') {
  if (!isLive) return { c: [65000], v: [1250] };
  try {
    const ticker = await kraken.api('Ticker', { pair });
    return ticker.result[pair];
  } catch (err) {
    console.error('[KRAKEN] Ticker error:', err.message);
    return null;
  }
}

async function placeOrder(strategy, side, volume, price = null) {
  const pair = strategy.asset === 'BTC/USD' ? 'XBTUSD' : strategy.asset.replace('/', '');
  
  console.log(`[KRAKEN] ${side.toUpperCase()} ${volume} ${strategy.asset} @ ${price || 'market'}`);
  
  if (!isLive) {
    console.log('[KRAKEN] Dry-run – order not executed');
    return { success: true, orderId: `dry_run_${Date.now()}`, dryRun: true };
  }
  
  try {
    const order = await kraken.api('AddOrder', {
      pair: pair,
      type: side,
      ordertype: price ? 'limit' : 'market',
      price: price,
      volume: volume,
      validate: false
    });
    console.log(`[KRAKEN] Order placed: ${order.result.txid[0]}`);
    return { success: true, orderId: order.result.txid[0] };
  } catch (err) {
    console.error('[KRAKEN] Order error:', err.message);
    return { success: false, error: err.message };
  }
}

async function cancelOrder(orderId) {
  if (!isLive) return { success: true };
  try {
    const result = await kraken.api('CancelOrder', { txid: orderId });
    return { success: true };
  } catch (err) {
    console.error('[KRAKEN] Cancel error:', err.message);
    return { success: false };
  }
}

async function getOrderStatus(orderId) {
  if (!isLive) return { status: 'closed', price: 65000 };
  try {
    const orders = await kraken.api('QueryOrders', { txid: orderId });
    return orders.result[orderId];
  } catch (err) {
    console.error('[KRAKEN] Order status error:', err.message);
    return null;
  }
}

module.exports = { initKraken, getBalance, getTicker, placeOrder, cancelOrder, getOrderStatus, isLive: () => isLive };
