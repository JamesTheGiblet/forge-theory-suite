const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../bus/router');

class SelfImprover {
  constructor() {
    this.suggestions = [];
    this.improvements = [];
  }

  async analyzePerformance() {
    // console.log('[SELF] Analyzing system performance...');
    
    const stats = await this.getCoreStats();
    const portfolio = await this.getPortfolioStats();
    
    const analysis = {
      timestamp: Date.now(),
      metrics: stats,
      portfolio: portfolio,
      weaknesses: [],
      strengths: []
    };
    
    if (stats.strategies < 20) {
      analysis.weaknesses.push('Low strategy count');
    }
    if (portfolio.winRate < 50 && portfolio.trades > 10) {
      analysis.weaknesses.push(`Win rate is ${portfolio.winRate}%`);
    }
    if (stats.breaches === 0) {
      analysis.strengths.push('Perfect safety record');
    }
    
    this.lastAnalysis = analysis;
    return analysis;
  }

  async getCoreStats() {
    try {
      const res = await fetch('http://localhost:3001/api/stats');
      return await res.json();
    } catch(e) {
      return { strategies: 0, breaches: 0, paperHours: 48 };
    }
  }

  async getPortfolioStats() {
    try {
      const res = await fetch('http://localhost:3002/api/portfolio/metrics');
      const data = await res.json();
      return {
        totalPnl: (data.metrics.totalPnl * 100).toFixed(1),
        winRate: data.metrics.winRate.toFixed(0),
        trades: data.metrics.totalTrades
      };
    } catch(e) {
      return { totalPnl: 0, winRate: 0, trades: 0 };
    }
  }

  async broadcastAnalysis() {
    const analysis = await this.analyzePerformance();
    
    let message = `🔍 *SELF-IMPROVEMENT ANALYSIS*\n\n`;
    message += `📊 Strategies: ${analysis.metrics.strategies}\n`;
    message += `🛡️ Breaches: ${analysis.metrics.breaches}\n`;
    message += `📋 Paper mode: ${analysis.metrics.paperHours}h left\n`;
    message += `💰 PnL: ${analysis.portfolio.totalPnl}%\n`;
    message += `🎯 Win rate: ${analysis.portfolio.winRate}%\n`;
    
    if (analysis.strengths.length > 0) {
      message += `\n✅ Strengths:\n`;
      analysis.strengths.forEach(s => message += `  • ${s}\n`);
    }
    if (analysis.weaknesses.length > 0) {
      message += `\n⚠️ Weaknesses:\n`;
      analysis.weaknesses.forEach(w => message += `  • ${w}\n`);
    }
    
    sendMessage('diplomat', 'SELF_IMPROVEMENT', { message });
  }

  start(intervalHours = 6) {
    // console.log(`[SELF] Self-improvement active – analyzing every ${intervalHours} hours`);
    this.broadcastAnalysis();
    setInterval(() => this.broadcastAnalysis(), intervalHours * 60 * 60 * 1000);
  }
}

module.exports = { SelfImprover };
