const { BaseAgent } = require('./base_agent');
const fs = require('fs');
const path = require('path');

class Tournament extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.contestants = [];
    this.rankings = [];
    this.rankingInterval = this.ranking_interval || 3600000;
    this.interval = null;
    this.strategyDir = "./data/strategies";
    this.rankingsFile = "./data/tournament_rankings.json";
  }
  
  async start() {
    await super.start();
    console.log('[Tournament] Starting strategy ranking system...');
    this.loadRankings();
    this.startRankingCycle();
    console.log('[Tournament] Active. Ranking interval:', this.rankingInterval, 'ms');
    return true;
  }
  
  loadRankings() {
    try {
      if (fs.existsSync(this.rankingsFile)) {
        this.rankings = JSON.parse(fs.readFileSync(this.rankingsFile, 'utf8'));
        console.log(`[Tournament] Loaded ${this.rankings.length} ranked strategies`);
      }
    } catch(e) { console.error('[Tournament] Failed to load rankings:', e.message); }
  }
  
  saveRankings() {
    fs.writeFileSync(this.rankingsFile, JSON.stringify(this.rankings, null, 2));
  }
  
  startRankingCycle() {
    this.interval = setInterval(() => this.updateRankings(), this.rankingInterval);
    setTimeout(() => this.updateRankings(), 5000);
  }
  
  async updateRankings() {
    console.log('[Tournament] Updating strategy rankings...');
    
    // Load all strategies
    const strategies = this.loadStrategies();
    if (strategies.length === 0) {
      console.log('[Tournament] No strategies to rank yet');
      return;
    }
    
    // Calculate scores for each strategy
    for (const strategy of strategies) {
      const existingRank = this.rankings.find(r => r.scp_id === strategy.scp_id);
      const score = this.calculateStrategyScore(strategy);
      const fitness = this.calculateFitness(strategy);
      
      if (existingRank) {
        existingRank.score = score;
        existingRank.last_updated = new Date().toISOString();
        existingRank.generation = strategy.lineage?.generation || 0;
      } else {
        this.rankings.push({
          scp_id: strategy.scp_id,
          name: strategy.name,
          object_class: strategy.object_class,
          score: score,
          generation: strategy.lineage?.generation || 0,
          parent: strategy.lineage?.parent,
          first_seen: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          mutations: strategy.lineage?.mutations?.length || 0
        });
      }
    }
    
    // Sort by score (highest first)
    this.rankings.sort((a, b) => b.score - a.score);
    
    // Keep top 100
    if (this.rankings.length > (this.max_contestants || 100)) {
      this.rankings = this.rankings.slice(0, this.max_contestants);
    }
    
    this.saveRankings();
    console.log(`[Tournament] Rankings updated. Top strategy: ${this.rankings[0]?.scp_id} (Score: ${this.rankings[0]?.score?.toFixed(2) || 0})`);
    
    // Emit leaderboard event
    this.emitLeaderboard();
  }
  
  loadStrategies() {
    if (!fs.existsSync(this.strategyDir)) return [];
    const files = fs.readdirSync(this.strategyDir).filter(f => f.endsWith('.json'));
    return files.map(file => {
      try {
        return JSON.parse(fs.readFileSync(path.join(this.strategyDir, file), 'utf8'));
      } catch(e) { return null; }
    }).filter(s => s);
  }
  
  calculateStrategyScore(strategy) {
    let score = 0;
    
    // Base score on object class
    switch(strategy.object_class) {
      case 'Keter': score += 80; break;
      case 'Euclid': score += 60; break;
      case 'Safe': score += 40; break;
      default: score += 50;
    }
    
    // Generation bonus (older strategies that survived mutation)
    const generation = strategy.lineage?.generation || 0;
    score += Math.min(20, generation * 2);
    
    // Mutation count (more mutations = more evolved)
    const mutationCount = strategy.lineage?.mutations?.length || 0;
    score += Math.min(15, mutationCount);
    
    // Risk-adjusted score
    const drawdown = strategy.containment_procedures?.max_drawdown_pct || 10;
    score += Math.max(0, 20 - drawdown);
    
    // Position size factor (conservative is better)
    const positionSize = parseFloat(strategy.risk?.position_size || 0.01);
    if (positionSize <= 0.01) score += 10;
    else if (positionSize <= 0.02) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }
  
  emitLeaderboard() {
    const top10 = this.rankings.slice(0, 10).map(r => ({
      rank: this.rankings.indexOf(r) + 1,
      scp_id: r.scp_id,
      score: r.score.toFixed(2),
      class: r.object_class
    }));
    
    console.log('[Tournament] 📊 LEADERBOARD:');
    top10.forEach(r => console.log(`   ${r.rank}. ${r.scp_id} (${r.class}) - ${r.score}`));
  }
  
  getRankings() {
    return this.rankings.slice(0, 20);
  }
  
  stop() {
    if (this.interval) clearInterval(this.interval);
    super.stop();
  }
}

module.exports = { Tournament };

// Multi‑objective fitness calculation
calculateFitness(strategy) {
  const weights = this.engine.scp.fitness_weights || {
    roi: 0.35, sharpe: 0.25, max_drawdown: 0.20, win_rate: 0.15, consistency: 0.05
  };
  
  const metrics = strategy.backtest_metrics || {};
  const roi = metrics.total_return || 0;
  const sharpe = metrics.sharpe_ratio || 0;
  const drawdown = metrics.max_drawdown || 100;
  const winRate = metrics.win_rate || 0;
  const consistency = 1 - (metrics.std_dev || 0.2); // lower std dev = more consistent
  
  // Normalize each to [0,1]
  const normRoi = Math.min(1, Math.max(0, (roi + 10) / 50));     // -10% to +40% -> 0..1
  const normSharpe = Math.min(1, Math.max(0, (sharpe + 1) / 3)); // -1 to 2 -> 0..1
  const normDrawdown = Math.min(1, Math.max(0, (100 - drawdown) / 80)); // 20% drawdown -> 1, 100% -> 0
  const normWinRate = winRate / 100;
  const normConsistency = consistency;
  
  const fitness =
    weights.roi * normRoi +
    weights.sharpe * normSharpe +
    weights.max_drawdown * normDrawdown +
    weights.win_rate * normWinRate +
    weights.consistency * normConsistency;
  
  return Math.min(1, Math.max(0, fitness));
}

getRegimeWeights() {
  // Get current regime from CascadeEngine if available
  let regime = 'DORMANT';
  if (global.cascadeEngine && global.cascadeEngine.state) {
    regime = global.cascadeEngine.state;
  }
  
  const presets = {
    DORMANT:   { roi: 0.2, sharpe: 0.2, max_drawdown: 0.3, win_rate: 0.2, consistency: 0.1 },
    CASCADE_1: { roi: 0.4, sharpe: 0.2, max_drawdown: 0.1, win_rate: 0.2, consistency: 0.1 },
    CASCADE_2: { roi: 0.5, sharpe: 0.2, max_drawdown: 0.05, win_rate: 0.15, consistency: 0.1 },
    SPILLWAY:  { roi: 0.1, sharpe: 0.1, max_drawdown: 0.5, win_rate: 0.2, consistency: 0.1 },
    EXTRACTION:{ roi: 0.05, sharpe: 0.05, max_drawdown: 0.7, win_rate: 0.1, consistency: 0.1 }
  };
  return presets[regime] || presets.DORMANT;
}

// Override calculateFitness to use dynamic weights
calculateFitnessDynamic(strategy) {
  const weights = this.getRegimeWeights();
  // ... use these weights instead of static ones
}
