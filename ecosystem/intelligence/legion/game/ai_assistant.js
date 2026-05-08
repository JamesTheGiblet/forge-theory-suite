const { logBreach } = require('../shared/observability_client');

class AIAssistant {
  constructor() {
    this.knowledgeBase = [];
    this.predictionAccuracy = 0;
    this.confidenceLevel = 0.5;
  }

  async analyzeSCP(scp) {
    console.log(`\n[ASSISTANT] Analyzing SCP ${scp.scp_id}...`);
    
    const similar = this.findSimilar(scp);
    const recommendations = [];
    
    if (scp.object_class === 'Safe') {
      recommendations.push('Standard containment protocol should suffice');
      recommendations.push('Low risk, minimal resources needed');
    } else if (scp.object_class === 'Euclid') {
      recommendations.push('Requires active monitoring');
      recommendations.push('Recommend research team on standby');
      if (scp.counters?.includes('standard')) {
        recommendations.push('⚠️ This SCP may resist standard protocols');
      }
    } else if (scp.object_class === 'Keter') {
      recommendations.push('⚠️ EXTREME CAUTION REQUIRED');
      recommendations.push('Recommend military support');
      recommendations.push('Evacuation may be necessary');
      if (this.confidenceLevel > 0.7) {
        recommendations.push(`🎯 Predicted weakness: ${this.predictWeakness(scp)}`);
      }
    }
    
    if (similar.length > 0) {
      this.confidenceLevel = Math.min(0.95, this.confidenceLevel + 0.1);
      recommendations.push(`📊 Confidence: ${(this.confidenceLevel * 100).toFixed(0)}%`);
    }
    
    return {
      scp_id: scp.scp_id,
      recommendations,
      confidence: this.confidenceLevel,
      suggestedTactic: this.suggestTactic(scp)
    };
  }

  findSimilar(scp) {
    return this.knowledgeBase.filter(k => 
      k.object_class === scp.object_class
    );
  }

  predictWeakness(scp) {
    const weaknesses = {
      'aggressive': 'research',
      'research': 'standard',
      'standard': 'aggressive'
    };
    const commonTactic = scp.counters?.[0] || 'standard';
    return weaknesses[commonTactic] || 'standard';
  }

  suggestTactic(scp) {
    const tacticScores = { standard: 0, aggressive: 0, research: 0, evacuate: 0 };
    
    for (const past of this.knowledgeBase) {
      if (past.result?.success) {
        tacticScores[past.tactic] += 1;
      }
    }
    
    let bestTactic = 'standard';
    let bestScore = 0;
    for (const [tactic, score] of Object.entries(tacticScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestTactic = tactic;
      }
    }
    
    return bestTactic;
  }

  async learnFromOutcome(scp, tactic, result) {
    this.knowledgeBase.push({
      scp_id: scp.scp_id,
      object_class: scp.object_class,
      tactic,
      result,
      timestamp: Date.now()
    });
    
    const recentSuccess = this.knowledgeBase.slice(-10).filter(k => k.result.success).length;
    this.predictionAccuracy = recentSuccess / 10;
    this.confidenceLevel = Math.min(0.9, this.confidenceLevel + (result.success ? 0.05 : -0.03));
    
    console.log(`[ASSISTANT] Learned from ${scp.scp_id}`);
    console.log(`[ASSISTANT] Accuracy: ${(this.predictionAccuracy * 100).toFixed(0)}%`);
  }

  async predictBreachRisk(scp) {
    let risk = 0;
    if (scp.object_class === 'Keter') risk += 0.5;
    if (scp.object_class === 'Euclid') risk += 0.3;
    if (scp.ai_adapted) risk += 0.2;
    
    risk = Math.min(0.95, risk);
    
    return {
      risk_percentage: (risk * 100).toFixed(0),
      risk_level: risk > 0.7 ? 'HIGH' : risk > 0.3 ? 'MEDIUM' : 'LOW'
    };
  }
}

module.exports = { AIAssistant };
