// tests/optimize.js
// AI-Enhanced Strategy Optimizer for CCE
// Uses Claude to analyze backtest results and suggest parameter improvements.

const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

class StrategyTester {
  constructor() {
    this.anthropic = process.env.ANTHROPIC_API_KEY 
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    
    this.results = [];
  }

  async run() {
    console.log('🚀 Starting CCE Strategy Optimizer (AI Enhanced)');
    console.log('================================================');

    // TODO: Replace this simulation with your actual Grid Search / Random Exploration loop
    // For now, we simulate results to demonstrate the AI analysis capabilities.
    console.log('🔄 Running simulations (Grid Search / Random)...');
    this.results = this._simulateBacktestResults();

    // Sort results
    const sorted = this.results.sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const baseline = sorted.find(r => r.name.includes('BASELINE')) || sorted[sorted.length - 1];

    console.log(`\n✅ Optimization Complete. Tested ${this.results.length} configs.`);
    console.log(`🏆 Best Config: ${best.name} (Score: ${best.score.toFixed(2)})`);

    // Generate Report & Ask AI
    await this._generateReport(this.results, baseline, best);
  }

  async _getAISuggestions(results) {
    if (!this.anthropic) {
      console.log('   ℹ️  No Claude key found — skipping AI suggestions.');
      console.log('      (Add ANTHROPIC_API_KEY to .env to enable)');
      console.log(`      DEBUG: Looking for .env at: ${envPath}`);
      console.log(`      DEBUG: File exists? ${fs.existsSync(envPath)}`);
      if (fs.existsSync(envPath)) {
        console.log('      💡 TIP: Run "node scripts/check-env.js" to diagnose encoding issues.');
      }
      return null;
    }
  
    console.log('\n🤖 Asking AI to analyse results...');
  
    // Build a concise summary of top results for GPT
    const top10 = [...results]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => ({
        name:     r.name,
        config:   r.config,
        return:   `${r.metrics.totalReturn.toFixed(0)}%`,
        alpha:    `${r.metrics.alphaVsBTC.toFixed(0)}%`,
        drawdown: `${(r.metrics.maxDrawdown * 100).toFixed(1)}%`,
        sharpe:   r.metrics.sharpeRatio.toFixed(2),
        score:    r.score.toFixed(2)
      }));
  
    const worst5 = [...results]
      .filter(r => !r.name.includes('BASELINE'))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(r => ({
        name:     r.name,
        config:   r.config,
        drawdown: `${(r.metrics.maxDrawdown * 100).toFixed(1)}%`,
        sharpe:   r.metrics.sharpeRatio.toFixed(2)
      }));
  
    const prompt = `
  You are analysing backtest results for a cryptocurrency portfolio state machine called CCE.
  The system has 8 states: DORMANT, ACCUMULATION, ANCHOR, IGNITION, CASCADE_1, CASCADE_2, SPILLWAY, EXTRACTION.
  
  The key parameters being optimised are:
  - minDormantDays: How long the system waits in cash before re-entering the market
  - ignitionTrailingStopPct: How far BTC can drop from peak before exiting IGNITION state
  - minHoldDays per state: Minimum days before the system can exit each state
  
  Scoring formula: ((sharpe * 2.0) + (log10(return) * 1.5)) * drawdown_penalty
  Drawdown penalties: >40% = 0.8x, >50% = 0.5x, >60% = 0.2x, >70% = disqualified
  
  TOP 10 CONFIGS:
  ${JSON.stringify(top10, null, 2)}
  
  WORST 5 CONFIGS (for pattern analysis):
  ${JSON.stringify(worst5, null, 2)}
  
  Based on these results:
  1. What patterns do you see in the best performing configs vs worst?
  2. What parameter ranges appear most promising that haven't been fully explored?
  3. Suggest 3 specific new configs to test next, with exact parameter values and your reasoning.
  4. Are there any concerning patterns in the data (overfitting risk, unstable regions)?
  
  Respond in JSON format:
  {
    "patterns": "string",
    "unexplored": "string", 
    "suggestions": [
      {
        "reasoning": "string",
        "config": {
          "minDormantDays": number,
          "ignitionTrailingStopPct": number,
          "minHoldDays": {
            "IGNITION": number,
            "CASCADE_1": number,
            "CASCADE_2": number,
            "SPILLWAY": number
          }
        }
      }
    ],
    "warnings": "string"
  }`;
  
    try {
      const message = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        messages: [
          { role: "user", content: prompt }
        ]
      });
      
      // Clean up markdown code blocks if present
      const text = message.content[0].text;
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
  
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('   ⚠️  AI analysis failed:', e.message);
      if (e.message.includes('credit balance is too low')) {
        console.warn('      (Your Anthropic API credit balance is too low. Please upgrade your plan.)');
      }
      return null;
    }
  }

  async _generateReport(results, baseline, best) {
    const reportPayload = {
      timestamp: new Date().toISOString(),
      bestConfig: best,
      baseline: baseline,
      totalRuns: results.length
    };

    // AI Analysis
    const aiInsights = await this._getAISuggestions(results);
    if (aiInsights) {
      console.log('\n🤖 AI ANALYSIS');
      console.log('='.repeat(80));
      console.log('\n📊 Patterns Observed:');
      console.log(`   ${aiInsights.patterns}`);
      console.log('\n🔭 Unexplored Territory:');
      console.log(`   ${aiInsights.unexplored}`);
      
      if (aiInsights.warnings) {
        console.log('\n⚠️  Warnings:');
        console.log(`   ${aiInsights.warnings}`);
      }

      console.log('\n💡 Suggested Next Configs:');
      aiInsights.suggestions.forEach((s, i) => {
        console.log(`\n   ${i + 1}. ${s.reasoning}`);
        console.log(`      ${JSON.stringify(s.config)}`);
      });

      // Include AI insights in report
      reportPayload.aiInsights = aiInsights;
    }

    // Save report to disk
    const reportPath = path.join(__dirname, '..', 'optimization-results', `opt_report_${Date.now()}.json`);
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  _simulateBacktestResults() {
    // Generates dummy data to test the AI integration
    const results = [];
    for (let i = 0; i < 20; i++) {
      const isGood = Math.random() > 0.5;
      results.push({
        name: `Config_${i}`,
        config: {
          minDormantDays: 20 + Math.floor(Math.random() * 40),
          ignitionTrailingStopPct: 0.02 + (Math.random() * 0.05),
          minHoldDays: { IGNITION: 3, CASCADE_1: 14, CASCADE_2: 14, SPILLWAY: 7 }
        },
        metrics: {
          totalReturn: isGood ? 500 + Math.random() * 500 : -50 + Math.random() * 100,
          alphaVsBTC: isGood ? 50 + Math.random() * 100 : -20,
          maxDrawdown: isGood ? 0.2 + Math.random() * 0.1 : 0.5 + Math.random() * 0.2,
          sharpeRatio: isGood ? 2.0 + Math.random() : 0.5 + Math.random()
        },
        score: isGood ? 8.0 + Math.random() * 2 : 2.0 + Math.random()
      });
    }
    return results;
  }
}

if (require.main === module) {
  new StrategyTester().run();
}