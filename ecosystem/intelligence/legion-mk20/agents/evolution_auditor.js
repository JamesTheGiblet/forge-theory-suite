const { BaseAgent } = require('./base_agent');
const fs = require('fs');
const path = require('path');

class EvolutionAuditor extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.mutationsScp = null;
    this.agentPerformance = new Map(); // agentId -> performance metrics
    this.mutationHistory = []; // log of all mutations
    this.interval = null;
    this.checkInterval = this.check_interval || 3600000; //每小时检查一次
  }
  
  async start() {
    await super.start();
    this.loadMutationsSCP();
    this.log(`🧬 Evolution Auditor active — watching ${this.engine.agents.size} agents`);
    this.startMonitoring();
    return true;
  }
  
  loadMutationsSCP() {
    try {
      this.mutationsScp = JSON.parse(fs.readFileSync('./scp/mutations.scp.json', 'utf8'));
      this.log(`📋 Loaded mutation rules for ${Object.keys(this.mutationsScp.mutation_rules).length} parameter types`);
    } catch(e) {
      this.log(`⚠️ Failed to load mutations SCP: ${e.message}`);
      this.mutationsScp = null;
    }
  }
  
  startMonitoring() {
    this.interval = setInterval(() => this.auditAllAgents(), this.checkInterval);
    setTimeout(() => this.auditAllAgents(), 10000);
  }
  
  async auditAllAgents() {
    this.log(`🔍 Starting agent performance audit...`);
    
    for (const [agentId, agent] of this.engine.agents) {
      await this.auditAgent(agentId, agent);
    }
    
    this.log(`✅ Audit complete. ${this.mutationHistory.length} total mutations to date.`);
  }
  
  async auditAgent(agentId, agent) {
    const performance = await this.measurePerformance(agent);
    const previous = this.agentPerformance.get(agentId);
    
    // Store current performance
    this.agentPerformance.set(agentId, performance);
    
    // Calculate performance trend
    const trend = previous ? this.calculateTrend(previous, performance) : 0;
    
    // Check if mutation is needed
    const needsMutation = this.shouldMutate(performance, trend);
    
    if (needsMutation) {
      this.log(`⚠️ Agent ${agent.name} (${agentId}) needs mutation — Performance: ${(performance.overall * 100).toFixed(1)}%`);
      await this.triggerMutation(agentId, agent, performance);
    } else if (performance.overall < 0.3) {
      this.log(`🔴 Agent ${agent.name} (${agentId}) is critically underperforming — Flagged`);
      await this.flagForReplacement(agentId, agent);
    }
  }
  
  async measurePerformance(agent) {
    // Collect metrics based on agent type
    const metrics = {
      accuracy: 0.5 + Math.random() * 0.4, // Placeholder — would be real data
      response_time: Math.random() * 1000,
      success_rate: 0.4 + Math.random() * 0.5,
      resource_usage: Math.random() * 100,
      roi: (Math.random() - 0.5) * 0.2
    };
    
    // Calculate overall score
    const weights = this.mutationsScp?.fitness_metrics || {
      accuracy: 0.3, response_time: 0.1, success_rate: 0.3, resource_usage: 0.1, roi: 0.2
    };
    
    let overall = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      let value = metrics[metric];
      if (metric === 'response_time' || metric === 'resource_usage') {
        value = 1 - Math.min(1, value / 100);
      }
      if (metric === 'roi') {
        value = Math.min(1, Math.max(0, (value + 0.1) / 0.3));
      }
      overall += value * weight;
    }
    
    metrics.overall = Math.min(1, Math.max(0, overall));
    return metrics;
  }
  
  calculateTrend(prev, curr) {
    return curr.overall - prev.overall;
  }
  
  shouldMutate(performance, trend) {
    // Mutate if performance is low AND not improving, or if it's been a while since last mutation
    if (performance.overall < 0.4 && trend < 0.05) return true;
    if (performance.overall < 0.6 && trend < -0.1) return true;
    
    // Check cooldown
    const lastMutation = this.mutationHistory.filter(m => m.agentId === agentId).pop();
    if (lastMutation) {
      const timeSince = Date.now() - new Date(lastMutation.timestamp).getTime();
      if (timeSince < (this.mutationsScp?.containment?.mutation_cooldown_ms || 3600000)) {
        return false;
      }
    }
    
    return Math.random() < 0.1; // 10% chance of random evolution
  }
  
  async triggerMutation(agentId, agent, performance) {
    const mutationType = this.selectMutationStrategy();
    const parameter = this.selectParameterToMutate(agent);
    
    const oldValue = this.getParameterValue(agent, parameter);
    const newValue = this.mutateValue(oldValue, parameter, mutationType);
    
    this.log(`🧬 Mutating ${agent.name}: ${parameter} = ${oldValue} → ${newValue} (${mutationType})`);
    
    // Apply mutation to agent
    this.setParameterValue(agent, parameter, newValue);
    
    // Record mutation
    this.mutationHistory.push({
      timestamp: new Date().toISOString(),
      agentId,
      agentName: agent.name,
      parameter,
      oldValue,
      newValue,
      strategy: mutationType,
      performanceBefore: performance.overall
    });
    
    // Save mutation history
    this.saveMutationHistory();
    
    // Notify system
    this.engine.updateEntropy(0.05, `mutation_${agent.name}_${parameter}`);
  }
  
  selectMutationStrategy() {
    const strategies = this.mutationsScp?.evolution_strategies || {
      random_mutation: 0.6, hill_climbing: 0.3, crossover: 0.1
    };
    const rand = Math.random();
    let cumulative = 0;
    for (const [strategy, prob] of Object.entries(strategies)) {
      cumulative += prob;
      if (rand < cumulative) return strategy;
    }
    return 'random_mutation';
  }
  
  selectParameterToMutate(agent) {
    const agentType = agent.constructor.name;
    const availableParams = [];
    
    for (const [param, rules] of Object.entries(this.mutationsScp?.mutation_rules || {})) {
      if (rules.agent_types.includes(agentType)) {
        availableParams.push(param);
      }
    }
    
    if (availableParams.length === 0) return 'check_interval';
    return availableParams[Math.floor(Math.random() * availableParams.length)];
  }
  
  getParameterValue(agent, param) {
    switch(param) {
      case 'learning_rate': return agent.learning_rate || 0.3;
      case 'memory_size': return agent.memory_size || 10000;
      case 'exploration_rate': return agent.exploration_rate || 0.1;
      case 'confidence_threshold': return agent.confidence_threshold || 0.65;
      case 'check_interval': return agent.check_interval || 30000;
      case 'batch_size': return agent.batch_size || 32;
      default: return 0;
    }
  }
  
  mutateValue(oldValue, param, strategy) {
    const rules = this.mutationsScp?.mutation_rules?.[param];
    if (!rules) return oldValue * (1 + (Math.random() - 0.5) * 0.2);
    
    const range = rules.range;
    const step = rules.step;
    
    if (strategy === 'random_mutation') {
      let newValue = oldValue + (Math.random() - 0.5) * step * 5;
      if (range) newValue = Math.min(range[1], Math.max(range[0], newValue));
      return parseFloat(newValue.toFixed(4));
    }
    
    if (strategy === 'hill_climbing') {
      const improvement = (Math.random() - 0.5) > 0 ? step : -step;
      let newValue = oldValue + improvement;
      if (range) newValue = Math.min(range[1], Math.max(range[0], newValue));
      return parseFloat(newValue.toFixed(4));
    }
    
    return oldValue;
  }
  
  setParameterValue(agent, param, value) {
    switch(param) {
      case 'learning_rate': agent.learning_rate = value; break;
      case 'memory_size': agent.memory_size = value; break;
      case 'exploration_rate':
        if (agent.setEpsilon) agent.setEpsilon(value);
        agent.exploration_rate = value;
        break;
      case 'confidence_threshold': agent.confidence_threshold = value; break;
      case 'check_interval':
        agent.check_interval = value;
        if (agent.restartMonitoring) agent.restartMonitoring();
        break;
      case 'batch_size': agent.batch_size = value; break;
      default: break;
    }
  }
  
  async flagForReplacement(agentId, agent) {
    this.log(`🚨 Agent ${agent.name} flagged for replacement — performance critical`);
    // Would trigger ForgeLord to generate replacement
  }
  
  saveMutationHistory() {
    const historyPath = './data/mutation_history.json';
    fs.writeFileSync(historyPath, JSON.stringify(this.mutationHistory, null, 2));
  }
  
  getMutationHistory(agentName = null) {
    if (agentName) {
      return this.mutationHistory.filter(m => m.agentName === agentName);
    }
    return this.mutationHistory;
  }
  
  getAgentPerformance(agentId) {
    return this.agentPerformance.get(agentId);
  }
  
  async stop() {
    if (this.interval) clearInterval(this.interval);
    await super.stop();
  }
}

module.exports = { EvolutionAuditor };
