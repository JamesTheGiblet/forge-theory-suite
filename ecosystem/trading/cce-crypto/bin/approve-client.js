#!/usr/bin/env node
// ── CCE Client Approval Script ────────────────────────────────────────────────
// Usage: node approve-client.js <access-code>
// Run from: /home/cce/clients/james/bin/
// Effect: Marks client as paid, generates one-time setup token, sends Telegram

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs    = require('fs');
const path  = require('path');
const axios = require('axios');
const crypto = require('crypto');

const code = process.argv[2]?.toUpperCase();
if (!code) {
  console.error('Usage: node approve-client.js <access-code>');
  console.error('Example: node approve-client.js CCE-TG-CT78ZW');
  process.exit(1);
}

const logPath = path.join(__dirname, '..', 'data', 'onboarding-log.json');
let log = [];
try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); }
catch(e) { console.error('❌ Could not read onboarding log:', e.message); process.exit(1); }

const idx = log.findIndex(e => e.code?.toUpperCase() === code);
if (idx === -1) {
  console.error(`❌ Code not found: ${code}`);
  process.exit(1);
}

const entry = log[idx];

if (entry.deployed) {
  console.error(`❌ ${entry.name} is already deployed.`);
  process.exit(1);
}

if (entry.approved) {
  console.log(`⚠️  Already approved. Token: ${entry.setupToken}`);
  console.log(`⚠️  Expires: ${entry.tokenExpiry}`);
  console.log(`🔗 https://cce-trading.co.uk/setup?token=${entry.setupToken}`);
  process.exit(0);
}

// Generate one-time token
const token = crypto.randomBytes(24).toString('hex');
const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24hrs

log[idx].approved     = true;
log[idx].approvedAt   = new Date().toISOString();
log[idx].setupToken   = token;
log[idx].tokenExpiry  = expiry;
log[idx].tokenUsed    = false;

fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

const setupUrl = `https://cce-trading.co.uk/setup?token=${token}`;

console.log(`\n✅ ${entry.name} approved`);
console.log(`🔑 Code: ${code}`);
console.log(`🔗 Setup URL: ${setupUrl}`);
console.log(`⏰ Expires: ${expiry}\n`);

// Send Telegram to client if they have a chat ID
// (We don't have their ID yet at this point — so send to James only)
async function notify() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) { console.warn('⚠️  No Telegram config — skipping notification'); return; }
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: `⚡ <b>Client Approved</b>\n\n👤 ${entry.name}\n🔑 ${code}\n🔗 <a href="${setupUrl}">Setup Link</a>\n⏰ Expires in 24hrs\n\nSend them this link to complete setup.`,
      parse_mode: 'HTML'
    });
    console.log('📱 Telegram notification sent to you.');
  } catch(e) {
    console.warn('⚠️  Telegram failed:', e.message);
  }
}

notify().then(() => process.exit(0));
