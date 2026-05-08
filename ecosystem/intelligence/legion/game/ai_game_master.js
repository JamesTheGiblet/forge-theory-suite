class AIGameMaster {
  constructor() {
    this.playerHistory = [];
    this.activeSCPs = [];
    this.metaEntropy = 0;
    this.difficulty = 1.0;
  }

  async generateAdaptiveSCP() {
    const successfulActions = this.playerHistory.filter(p => p.result.success);
    const commonTactics = this.extractPatterns(successfulActions);
    
    const scp = {
      scp_id: `SCP-${Math.floor(Math.random() * 9999)}`,
      name: `Anomaly #${this.activeSCPs.length + 1}`,
      object_class: this.calculateClass(),
      counters: commonTactics,
      ai_adapted: true,
      adaptation_level: this.metaEntropy
    };
    
    this.activeSCPs.push(scp);
    console.log(`[ENEMY_AI] New SCP: ${scp.scp_id} (${scp.object_class})`);
    
    return scp;
  }

  extractPatterns(history) {
    const tacticCount = {};
    for (const entry of history) {
      const tactic = entry.action.tactic || 'standard';
      tacticCount[tactic] = (tacticCount[tactic] || 0) + 1;
    }
    
    let maxTactic = 'standard';
    let maxCount = 0;
    for (const [tactic, count] of Object.entries(tacticCount)) {
      if (count > maxCount) {
        maxCount = count;
        maxTactic = tactic;
      }
    }
    
    return [maxTactic];
  }

  calculateClass() {
    if (this.metaEntropy > 0.7) return 'Keter';
    if (this.metaEntropy > 0.4) return 'Euclid';
    if (this.difficulty > 1.5) return 'Keter';
    return 'Safe';
  }

  async validateContainment(scp, playerSolution) {
    const success = Math.random() > (0.3 * this.difficulty);
    
    if (success) {
      this.activeSCPs = this.activeSCPs.filter(s => s.scp_id !== scp.scp_id);
      this.metaEntropy = Math.max(0, this.metaEntropy - 0.1);
    } else {
      const index = this.activeSCPs.findIndex(s => s.scp_id === scp.scp_id);
      if (index !== -1) {
        this.activeSCPs[index].counters = [playerSolution.tactic];
      }
    }
    
    return { passed: success };
  }

  async learnFromPlayer(action, result) {
    this.playerHistory.push({
      action,
      result,
      timestamp: Date.now(),
      difficulty: this.difficulty
    });
    
    this.metaEntropy = Math.min(0.9, this.metaEntropy + 0.05);
    
    const recentSuccess = this.playerHistory.slice(-5).filter(p => p.result.success).length;
    if (recentSuccess > 3) {
      this.difficulty = Math.min(2.0, this.difficulty + 0.1);
    } else if (recentSuccess < 2) {
      this.difficulty = Math.max(0.5, this.difficulty - 0.1);
    }
  }

  getGameState() {
    return {
      metaEntropy: this.metaEntropy,
      difficulty: this.difficulty,
      activeSCPs: this.activeSCPs.length,
      threatLevel: this.metaEntropy > 0.7 ? 'CRITICAL' : this.metaEntropy > 0.3 ? 'ELEVATED' : 'NORMAL'
    };
  }
}

module.exports = { AIGameMaster };
