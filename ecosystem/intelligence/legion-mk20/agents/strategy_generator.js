const { BaseAgent } = require('./base_agent');
const fs = require('fs');

class StrategyGenerator extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.generatedStrategies = [];
    this.promotedStrategies = []; // Strategies that moved from OBSERVE to BOT/ENGINE/ANCHOR
    this.classifications = ["BOT", "ENGINE", "ANCHOR", "OBSERVE"];
    
    // Load the classification system
    this.loadClassificationSystem();
  }
  
  loadClassificationSystem() {
    try {
      const classificationData = JSON.parse(fs.readFileSync('./scp/strategy_classification.scp.json', 'utf8'));
      this.decisionMatrix = classificationData.decision_matrix;
      this.classDefinitions = classificationData.classifications;
      this.log(`📋 Loaded classification system with ${this.decisionMatrix.length} decision rules`);
    } catch(e) {
      this.log(`⚠️ Could not load classification system: ${e.message}`);
      this.decisionMatrix = [];
    }
  }
  
  async start() {
    await super.start();
    this.log(`🧠 Strategy Generator active — creating obscure, unorthodox strategies`);
    this.startGeneration();
    return true;
  }
  
  startGeneration() {
    setInterval(() => this.generateAndClassify(), this.generation_interval_ms || 300000);
    setTimeout(() => this.generateAndClassify(), 5000);
  }
  
  async generateAndClassify() {
    // Generate a new obscure strategy
    const strategy = this.generateObscureStrategy();
    
    // Classify it using the decision matrix
    const classification = this.classifyStrategy(strategy);
    strategy.classification = classification.action;
    strategy.classification_reason = classification.reason;
    
    // Store it
    this.generatedStrategies.unshift(strategy);
    if (this.generatedStrategies.length > 100) this.generatedStrategies.pop();
    
    this.log(`🔮 Generated: ${strategy.name} → ${strategy.classification} (${strategy.confidence}% confidence)`);
    
    // If confidence is high enough, promote to candidate for BOT/ENGINE/ANCHOR
    if (strategy.confidence > (this.min_confidence_for_promotion || 70) && 
        strategy.classification !== 'OBSERVE') {
      await this.promoteStrategy(strategy);
    }
  }
  
  generateObscureStrategy() {
    const strategyTypes = [
      // BTC-first strategies
      { trigger: "BTC confirms 3 days of upward movement", entry: "Enter BTC immediately", exit: "Exit when BTC loses momentum", classHint: "ENGINE" },
      { trigger: "BTC dumps > 5% in 24 hours", entry: "Start 3-week timer", exit: "Buy alts at week 3, sell week 5", classHint: "ENGINE" },
      { trigger: "BTC RSI < 30 on daily", entry: "Buy BTC", exit: "Sell when RSI > 50", classHint: "BOT" },
      
      // Large cap strategies
      { trigger: "ETH up 5% while BTC flat", entry: "Buy ETH", exit: "Sell when ETH/BTC ratio drops", classHint: "BOT" },
      { trigger: "SOL volume spikes 200%", entry: "Enter SOL", exit: "Exit when volume normalizes", classHint: "BOT" },
      
      // Small cap / obscure strategies
      { trigger: "Low cap alt has 3 green days with increasing volume", entry: "Enter position", exit: "Exit after 5 days or -10%", classHint: "OBSERVE" },
      { trigger: "BTC dominance drops 3% in a week", entry: "Buy alt basket", exit: "Sell when dominance stabilizes", classHint: "ENGINE" },
      
      // Sentiment strategies
      { trigger: "Fear & Greed < 20", entry: "Scale into BTC", exit: "Exit when Fear & Greed > 50", classHint: "ANCHOR" },
      { trigger: "Fear & Greed > 80", entry: "Sell into strength", exit: "Buy back when Fear & Greed < 60", classHint: "ANCHOR" },
      
      // Unorthodox / experimental
      { trigger: "3 consecutive lower highs on 4h", entry: "Short", exit: "Cover on first higher low", classHint: "OBSERVE" },
      { trigger: "Volume divergence on 1h", entry: "Contrarian position", exit: "When volume confirms", classHint: "OBSERVE" }
    ];
    
    const base = strategyTypes[Math.floor(Math.random() * strategyTypes.length)];
    const namePrefixes = ["Quantum", "Oscillating", "Phantom", "Echo", "Cascade", "Whisper", "Shadow", "Ripple"];
    const nameSuffixes = ["Hunter", "Rider", "Catcher", "Watcher", "Forger", "Weaver"];
    
    const confidence = Math.floor(40 + Math.random() * 50);
    
    return {
      id: `OBS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: `${namePrefixes[Math.floor(Math.random() * namePrefixes.length)]} ${base.classHint} ${nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)]}`,
      trigger: base.trigger,
      entry: base.entry,
      exit: base.exit,
      confidence: confidence,
      suggested_class: base.classHint,
      created: new Date().toISOString()
    };
  }
  
  classifyStrategy(strategy) {
    // Use the decision matrix if available
    if (this.decisionMatrix && this.decisionMatrix.length > 0) {
      // Simulate market conditions based on strategy confidence
      const marketConditions = {
        confidence: strategy.confidence / 100,
        pattern_clear: strategy.confidence > 70,
        cascade_detected: strategy.suggested_class === 'ENGINE',
        btc_confirming: strategy.trigger.includes('BTC'),
        temporal_lag_active: strategy.trigger.includes('3-day') || strategy.trigger.includes('week'),
        volatility: strategy.suggested_class === 'OBSERVE' ? 0.08 : 0.03,
        fear_greed: strategy.confidence > 80 ? 75 : 45
      };
      
      for (const rule of this.decisionMatrix) {
        if (this.evaluateCondition(rule.condition, marketConditions)) {
          return { action: rule.action, reason: rule.reason };
        }
      }
    }
    
    // Fallback: use suggested class
    let action = strategy.suggested_class;
    if (action === 'OBSERVE' && strategy.confidence > 70) action = 'BOT';
    if (action === 'BOT' && strategy.confidence < 50) action = 'OBSERVE';
    
    return { action, reason: "Based on confidence and pattern type" };
  }
  
  evaluateCondition(condition, market) {
    // Parse and evaluate simple conditions
    if (condition.includes('confidence >')) {
      const threshold = parseFloat(condition.match(/confidence > (\d+)/)?.[1] || 85) / 100;
      return market.confidence > threshold;
    }
    if (condition.includes('confidence <')) {
      const threshold = parseFloat(condition.match(/confidence < (\d+)/)?.[1] || 60) / 100;
      return market.confidence < threshold;
    }
    if (condition.includes('pattern_clear')) return market.pattern_clear;
    if (condition.includes('cascade_detected')) return market.cascade_detected;
    if (condition.includes('btc_confirming')) return market.btc_confirming;
    if (condition.includes('temporal_lag_active')) return market.temporal_lag_active;
    if (condition.includes('volatility >')) return market.volatility > 0.05;
    if (condition.includes('fear_greed <')) return market.fear_greed < 20;
    if (condition.includes('fear_greed >')) return market.fear_greed > 80;
    return false;
  }
  
  async promoteStrategy(strategy) {
    this.promotedStrategies.unshift({
      ...strategy,
      promoted_at: new Date().toISOString(),
      promoted_from: strategy.classification,
      promoted_to: this.recommendPromotion(strategy)
    });
    
    if (this.promotedStrategies.length > 50) this.promotedStrategies.pop();
    
    this.log(`⭐ PROMOTED: ${strategy.name} → Ready for ${this.recommendPromotion(strategy)} consideration`);
    
    // TODO: Send to ForgeLord for integration into active strategy pool
    // sendMessage('forge_lord', 'NEW_CANDIDATE_STRATEGY', this.promotedStrategies[0]);
  }
  
  recommendPromotion(strategy) {
    if (strategy.confidence > 85 && strategy.suggested_class === 'BOT') return 'BOT_READY';
    if (strategy.confidence > 75 && strategy.suggested_class === 'ENGINE') return 'ENGINE_CANDIDATE';
    if (strategy.confidence > 70) return 'REVIEW';
    return 'OBSERVE';
  }
  
  getStatus() {
    return {
      generated_count: this.generatedStrategies.length,
      promoted_count: this.promotedStrategies.length,
      recent_generated: this.generatedStrategies.slice(0, 5),
      recent_promoted: this.promotedStrategies.slice(0, 3)
    };
  }
}

module.exports = { StrategyGenerator };
