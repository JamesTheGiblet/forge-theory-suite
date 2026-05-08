const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let messageQueue = [];
let isSending = false;

function sendMessage(text, parseMode = 'Markdown') {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('[TELEGRAM] Not configured – would send:', text.substring(0, 100));
    return Promise.resolve(false);
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });
    
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let response = '';
      res.on('data', chunk => response += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[TELEGRAM] Message sent successfully');
          resolve(true);
        } else {
          console.error('[TELEGRAM] Failed:', res.statusCode, response);
          resolve(false);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function queueMessage(text, parseMode = 'Markdown') {
  messageQueue.push({ text, parseMode });
  processQueue();
}

async function processQueue() {
  if (isSending || messageQueue.length === 0) return;
  isSending = true;
  
  while (messageQueue.length > 0) {
    const msg = messageQueue.shift();
    await sendMessage(msg.text, msg.parseMode);
    // Rate limit: 1 message per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  isSending = false;
}

function formatPnL(pnl) {
  const sign = pnl >= 0 ? '+' : '';
  const emoji = pnl >= 0.05 ? '🚀' : (pnl <= -0.03 ? '⚠️' : '📊');
  return `${emoji} ${sign}${(pnl * 100).toFixed(1)}%`;
}

function sendKeterAuthorised(strategyId, name, votes) {
  const text = `✅ *KETER STRATEGY AUTHORISED*\n\n` +
    `*ID:* ${strategyId}\n` +
    `*Name:* ${name}\n` +
    `*Votes:* ${votes.join(' + ')}\n\n` +
    `_Strategy has passed 3-agent consensus and is ready for paper trading._`;
  queueMessage(text);
}

function sendContainmentBreach(strategyId, name, breachReason) {
  const text = `⚠️ *CONTAINMENT BREACH*\n\n` +
    `*ID:* ${strategyId}\n` +
    `*Name:* ${name}\n` +
    `*Reason:* ${breachReason}\n\n` +
    `_Strategy moved to containment. Manual review required._`;
  queueMessage(text);
}

function sendApollyonTrigger(strategyId, name, breachReason) {
  const text = `🔥 *APOLLYON TRIGGERED*\n\n` +
    `*ID:* ${strategyId}\n` +
    `*Name:* ${name}\n` +
    `*Reason:* ${breachReason}\n\n` +
    `_Strategy DELETED and blacklisted. No revival possible._`;
  queueMessage(text);
}

function sendTournamentLeaderboard(leaderboard) {
  if (leaderboard.length === 0) return;
  
  let text = `🏆 *TOURNAMENT LEADERBOARD*\n\n`;
  for (let i = 0; i < Math.min(5, leaderboard.length); i++) {
    const s = leaderboard[i];
    text += `${i+1}. *${s.strategyId}* (${s.class})\n`;
    text += `   Real: ${formatPnL(s.realPnl)} | Paper: ${formatPnL(s.pnl)} | WR: ${(s.winRate*100).toFixed(0)}%\n`;
  }
  queueMessage(text);
}

function sendChameleonDecision(parentId, status, reason) {
  const emoji = status === 'evolving' ? '📈' : (status === 'thrashing' ? '📉' : '🤔');
  const title = status === 'evolving' ? 'LINEAGE EVOLVING' : (status === 'thrashing' ? 'LINEAGE THRASHING' : 'LINEAGE UNCERTAIN');
  
  const text = `${emoji} *${title}*\n\n` +
    `*Parent:* ${parentId}\n` +
    `*Reason:* ${reason}\n\n` +
    `_${status === 'evolving' ? 'Continuing mutations.' : (status === 'thrashing' ? 'Halting mutations. Consider archiving.' : 'Monitor closely.')}_`;
  queueMessage(text);
}

function sendPaperModeStatus(hoursRemaining, breaches) {
  const emoji = breaches === 0 ? '🟢' : '🔴';
  const text = `${emoji} *PAPER MODE STATUS*\n\n` +
    `*Remaining:* ${hoursRemaining.toFixed(1)} hours\n` +
    `*Breaches:* ${breaches}\n\n` +
    `_${breaches === 0 ? 'System stable. Zero containment breaches.' : 'Containment breaches detected. Investigation required.'}_`;
  queueMessage(text);
}

function sendRegimeShift(oldRegime, newRegime) {
  const text = `🔄 *REGIME SHIFT*\n\n` +
    `*Old:* ${oldRegime}\n` +
    `*New:* ${newRegime}\n\n` +
    `_Strategies re-evaluated based on new market conditions._`;
  queueMessage(text);
}

module.exports = {
  sendKeterAuthorised,
  sendContainmentBreach,
  sendApollyonTrigger,
  sendTournamentLeaderboard,
  sendChameleonDecision,
  sendPaperModeStatus,
  sendRegimeShift,
  queueMessage
};
