// src/notification.js — LCE Telegram Notifications

const axios = require('axios');
const config = require('../config');

class Notification {
  async send(message) {
    if (!config.telegram.token || !config.telegram.chatId) return;
    try {
      await axios.post(
        `https://api.telegram.org/bot${config.telegram.token}/sendMessage`,
        { chat_id: config.telegram.chatId, text: `🎯 LCE\n${message}`, parse_mode: 'HTML' },
        { timeout: 5000 }
      );
    } catch (err) {
      console.warn(`[LCE] Telegram error: ${err.message}`);
    }
  }

  tradeEntered(position) {
    this.send(
      `⚡ <b>CASCADE TRIGGERED</b>\n` +
      `${position.side} ${position.symbol}\n` +
      `Entry: $${position.entryPrice.toFixed(2)}\n` +
      `SL: $${position.stopLoss.toFixed(2)} | TP: $${position.takeProfit.toFixed(2)}\n` +
      `Size: $${position.sizeUsd.toFixed(2)}`
    );
  }

  tradeExited(symbol, reason, pnlPct) {
    const emoji = pnlPct > 0 ? '✅' : '❌';
    this.send(
      `${emoji} <b>TRADE CLOSED</b>\n` +
      `${symbol} | ${reason}\n` +
      `PnL: ${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%`
    );
  }

  cascadeDetected(symbol, liqUsd) {
    this.send(
      `👁 <b>CASCADE DETECTED</b>\n` +
      `${symbol} — $${(liqUsd / 1e6).toFixed(1)}M liquidated\n` +
      `Stalking for confirmation...`
    );
  }

  circuitBreaker(dailyPnl) {
    this.send(`⛔ <b>CIRCUIT BREAKER</b>\nDaily loss: ${dailyPnl.toFixed(2)}% — engine halted`);
  }
}

module.exports = Notification;
