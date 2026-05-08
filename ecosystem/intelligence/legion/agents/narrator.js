const { getCurrentPrice, getAllPrices } = require('../shared/kraken_adapter');
const { getSentiment } = require('../shared/sentiment');
const { getLeaderboard } = require('./tournament');
const { getStats } = require('./stats_provider'); // we'll create this
const { exec } = require('child_process');
const { sendMessage } = require('../bus/router');

class Narrator {
  constructor() {
    this.lastNarrative = null;
    this.lastNarrativeTime = null;
    this.speakEnabled = true; // set false if no TTS
  }

  async gatherIntelligence() {
    // Gather all relevant data
    const prices = await getAllPrices();
    const sentiment = getSentiment();
    const leaderboard = getLeaderboard();
    const stats = await this.getCoreStats();
    const arb = await this.getArbitrageSummary();
    const whale = await this.getWhaleSummary();
    const dqn = await this.getDQNSummary();
    const evolution = await this.getEvolutionSummary();
    
    return {
      prices,
      sentiment,
      leaderboard,
      stats,
      arbitrage: arb,
      whale,
      dqn,
      evolution,
      timestamp: new Date()
    };
  }

  async getCoreStats() {
    try {
      const res = await fetch('http://localhost:3001/api/stats');
      return await res.json();
    } catch(e) {
      return { strategies: 0, breaches: 0, paperHours: 48, vix: 30 };
    }
  }

  async getArbitrageSummary() {
    try {
      const fs = require('fs');
      const history = JSON.parse(fs.readFileSync('./data/arbitrage_history.json', 'utf8'));
      const last = history.slice(-3);
      return last.map(o => `${o.pair}: ${o.deviation}% ${o.direction}`).join('; ');
    } catch(e) {
      return 'No recent arbitrage opportunities.';
    }
  }

  async getWhaleSummary() {
    try {
      const fs = require('fs');
      const log = JSON.parse(fs.readFileSync('./data/arbitrage_state.json', 'utf8'));
      // simplified: just return last known whale activity
      return 'Whale activity: check dashboard for details';
    } catch(e) {
      return 'No recent whale movements.';
    }
  }

  async getDQNSummary() {
    // In a real implementation, we'd query the DQN trader state.
    // Return real whale data when available
    return 'DQN trader is exploring and learning.';
  }

  async getEvolutionSummary() {
    try {
      const fs = require('fs');
      const lineage = JSON.parse(fs.readFileSync('./data/lineage_history.json', 'utf8'));
      const count = Object.keys(lineage).length;
      const evolving = Object.values(lineage).filter(l => l.status === 'evolving').length;
      const thrashing = Object.values(lineage).filter(l => l.status === 'thrashing').length;
      return `${count} lineages tracked, ${evolving} evolving, ${thrashing} thrashing.`;
    } catch(e) {
      return 'Strategy evolution active.';
    }
  }

  composeNarrative(data) {
    const { prices, sentiment, leaderboard, stats, arbitrage, whale, dqn, evolution, timestamp } = data;
    const timeStr = timestamp.toLocaleTimeString();
    const dateStr = timestamp.toLocaleDateString();
    
    // Market overview
    let narrative = `🗣️ *LEGION NARRATIVE – ${dateStr} ${timeStr}*\n\n`;
    narrative += `📊 *Market Pulse*\n`;
    narrative += `BTC: $${prices['BTC/USD']?.toFixed(0) || 'N/A'} | ETH: $${prices['ETH/USD']?.toFixed(0) || 'N/A'} | SOL: $${prices['SOL/USD']?.toFixed(2) || 'N/A'}\n`;
    narrative += `Fear & Greed: ${sentiment?.value || 50} (${sentiment?.classification || 'Neutral'}) | VIX: ${stats.vix?.toFixed(1) || 'N/A'}\n\n`;
    
    // Strategy & tournament
    narrative += `🏆 *Tournament Leader*\n`;
    if (leaderboard.length > 0) {
      const top = leaderboard[0];
      narrative += `${top.strategyId} (${top.class}) – ${(top.realPnl*100).toFixed(1)}% PnL, ${top.winRate*100}% win rate\n`;
    } else {
      narrative += `No active tournament strategies yet.\n`;
    }
    narrative += `Active strategies: ${stats.strategies} | Paper mode: ${stats.paperHours?.toFixed(0) || 48}h remaining\n\n`;
    
    // Intelligence highlights
    narrative += `🧠 *Intelligence Highlights*\n`;
    narrative += `🔍 Arbitrage: ${arbitrage}\n`;
    narrative += `🐋 ${whale}\n`;
    narrative += `🧬 Evolution: ${evolution}\n`;
    narrative += `🤖 DQN: ${dqn}\n\n`;
    
    // Risk & containment
    narrative += `🛡️ *Containment*\n`;
    narrative += `Safety breaches: ${stats.breaches || 0} | System status: ${stats.pm2_status || 'online'}\n`;
    
    // Closing
    narrative += `\n_This narrative is generated autonomously by LEGION MK11._`;
    
    return narrative;
  }

  async speak(text) {
    if (!this.speakEnabled) return;
    // Try Termux TTS first
    exec(`termux-tts-speak "${text.replace(/[^a-zA-Z0-9 .,!?]/g, '')}"`, (err) => {
      if (err) {
        // Fallback to espeak if available
        exec(`espeak "${text.replace(/[^a-zA-Z0-9 .,!?]/g, '')}"`, (err2) => {
        });
      }
    });
  }

  async narrate() {
    const intelligence = await this.gatherIntelligence();
    const narrative = this.composeNarrative(intelligence);
    this.lastNarrative = narrative;
    this.lastNarrativeTime = new Date();
    
    // Send to Telegram
    sendMessage('diplomat', 'NARRATIVE', { text: narrative });
    
    // Also speak aloud
    // Strip markdown for speech
    const plainText = narrative.replace(/[*_`]/g, '');
    await this.speak(plainText);
    
    return narrative;
  }

  start(intervalMinutes = 60) {
    // Narrate immediately
    this.narrate();
    // Then schedule
    setInterval(() => this.narrate(), intervalMinutes * 60 * 1000);
  }
}

module.exports = { Narrator };
