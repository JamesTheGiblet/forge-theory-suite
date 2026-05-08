const { BaseAgent } = require('./base_agent');
const https = require('https');

class TelegramBot extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.alertTypes = this.alert_types || [];
    this.queue = [];
  }
  
  async start() {
    await super.start();
    if (this.token && this.chatId) {
      this.log(`Telegram Bot active. ${this.alertTypes.length} alert types configured`);
      this.startProcessor();
    } else {
      this.log('Telegram Bot disabled (missing credentials)', 'warn');
    }
    return true;
  }
  
  startProcessor() {
    setInterval(() => this.processQueue(), 1000);
  }
  
  async sendAlert(type, message) {
    if (!this.token || !this.chatId) return;
    if (!this.alertTypes.includes(type)) return;
    
    this.queue.push({ type, message, timestamp: Date.now() });
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    const alert = this.queue.shift();
    
    const text = `🤖 *LEGION MK20 Alert*\\n📌 *Type:* ${alert.type}\\n📝 *Message:* ${alert.message.substring(0, 400)}`;
    const data = JSON.stringify({ chat_id: this.chatId, text, parse_mode: 'MarkdownV2' });
    
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${this.token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => { res.resume(); });
    req.on('error', () => {});
    req.write(data);
    req.end();
  }
}

module.exports = { TelegramBot };
